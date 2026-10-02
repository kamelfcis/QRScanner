import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateImageFile } from '@/lib/upload';

const BUCKET = 'instapay-proofs';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 80);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const orderRef = String(formData.get('orderRef') ?? '').trim();
    if (!orderRef || !/^MS-\d+-[A-Z0-9]{4}$/.test(orderRef)) {
      return NextResponse.json({ error: 'Invalid order reference' }, { status: 400 });
    }

    const uploadOnly = formData.get('uploadOnly') === 'true';
    const file = formData.get('file');
    const existingScreenshotUrl = String(formData.get('screenshotUrl') ?? '').trim() || null;
    const proofReference = String(formData.get('proofReference') ?? '').trim() || null;
    const amountNote = String(formData.get('amountNote') ?? '').trim() || null;
    const customerName = String(formData.get('customerName') ?? '').trim();
    const customerPhone = String(formData.get('customerPhone') ?? '').trim() || null;
    const deliveryLocationId = String(formData.get('deliveryLocationId') ?? '').trim() || null;
    const deliveryFeeRaw = formData.get('deliveryFee');
    const deliveryFee =
      deliveryFeeRaw != null && deliveryFeeRaw !== '' ? Number(deliveryFeeRaw) : null;
    const markWhatsAppSent = formData.get('markWhatsAppSent') === 'true';

    let screenshotUrl = existingScreenshotUrl;

    if (file instanceof File && file.size > 0) {
      validateImageFile(file);
      const admin = createAdminClient();
      const path = `${orderRef}/${Date.now()}-${sanitizeFilename(file.name)}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: false,
      });
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }
      const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
      screenshotUrl = urlData.publicUrl;
    }

    if (uploadOnly) {
      if (!screenshotUrl) {
        return NextResponse.json({ error: 'Screenshot upload failed' }, { status: 400 });
      }
      return NextResponse.json({ screenshotUrl });
    }

    if (!customerName) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }
    if (deliveryFee == null || Number.isNaN(deliveryFee) || deliveryFee < 0) {
      return NextResponse.json({ error: 'Invalid delivery fee' }, { status: 400 });
    }
    if (!proofReference && !screenshotUrl) {
      return NextResponse.json(
        { error: 'Proof reference or screenshot required' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const row = {
      order_ref: orderRef,
      customer_name: customerName,
      customer_phone: customerPhone,
      delivery_location_id: deliveryLocationId,
      delivery_fee: deliveryFee,
      proof_reference: proofReference,
      screenshot_url: screenshotUrl,
      amount_note: amountNote,
      status: 'pending' as const,
      ...(markWhatsAppSent ? { whatsapp_sent_at: new Date().toISOString() } : {}),
    };

    const { data, error } = await admin
      .from('instapay_delivery_proofs')
      .upsert(row, { onConflict: 'order_ref' })
      .select('id, order_ref, screenshot_url')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      orderRef: data.order_ref,
      screenshotUrl: data.screenshot_url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
