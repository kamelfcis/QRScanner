import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidInstapayReference, normalizeInstapayReference } from '@/lib/payment/instapay-proof';
import { ImageValidationError, validateImageFile } from '@/lib/upload-validation';

const BUCKET = 'instapay-proofs';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 80);
}

async function isReferenceTaken(
  admin: ReturnType<typeof createAdminClient>,
  normalizedRef: string,
  excludeOrderRef?: string | null
): Promise<boolean> {
  let query = admin
    .from('instapay_delivery_proofs')
    .select('id')
    .ilike('proof_reference', normalizedRef)
    .in('status', ['pending', 'confirmed'])
    .limit(1);

  if (excludeOrderRef) {
    query = query.neq('order_ref', excludeOrderRef);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawRef = searchParams.get('reference');
    if (!rawRef?.trim()) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    const normalized = normalizeInstapayReference(rawRef);
    if (!isValidInstapayReference(normalized)) {
      return NextResponse.json(
        { error: 'Invalid reference format', code: 'instapay_reference_invalid' },
        { status: 400 }
      );
    }

    const excludeOrderRef = searchParams.get('excludeOrderRef')?.trim() || null;
    const admin = createAdminClient();
    const taken = await isReferenceTaken(admin, normalized, excludeOrderRef);

    return NextResponse.json({ available: !taken });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
    const rawProofReference = String(formData.get('proofReference') ?? '').trim() || null;
    const amountNote = String(formData.get('amountNote') ?? '').trim() || null;
    const customerName = String(formData.get('customerName') ?? '').trim();
    const customerPhone = String(formData.get('customerPhone') ?? '').trim() || null;
    const deliveryLocationId = String(formData.get('deliveryLocationId') ?? '').trim() || null;
    const deliveryFeeRaw = formData.get('deliveryFee');
    const deliveryFee =
      deliveryFeeRaw != null && deliveryFeeRaw !== '' ? Number(deliveryFeeRaw) : null;
    const markWhatsAppSent = formData.get('markWhatsAppSent') === 'true';

    let screenshotUrl = existingScreenshotUrl;
    let storedPath: string | null = null;

    if (file instanceof File && file.size > 0) {
      try {
        validateImageFile(file);
      } catch (err) {
        if (err instanceof ImageValidationError) {
          return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
        }
        throw err;
      }
      const admin = createAdminClient();
      const path = `${orderRef}/${Date.now()}-${sanitizeFilename(file.name)}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      });
      if (uploadError) {
        console.error('instapay_upload_failed', uploadError.message);
        return NextResponse.json(
          { error: uploadError.message, code: 'instapay_upload_failed' },
          { status: 500 }
        );
      }
      const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
      screenshotUrl = urlData.publicUrl;
      storedPath = path;
    }

    if (uploadOnly) {
      if (!screenshotUrl) {
        return NextResponse.json(
          { error: 'Screenshot upload failed', code: 'instapay_upload_failed' },
          { status: 400 }
        );
      }
      return NextResponse.json({ screenshotUrl, path: storedPath });
    }

    if (!customerName) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }
    if (deliveryFee == null || Number.isNaN(deliveryFee) || deliveryFee < 0) {
      return NextResponse.json({ error: 'Invalid delivery fee' }, { status: 400 });
    }

    const proofReference = rawProofReference ? normalizeInstapayReference(rawProofReference) : null;
    if (!proofReference || !isValidInstapayReference(proofReference)) {
      return NextResponse.json(
        { error: 'Valid proof reference is required', code: 'instapay_reference_invalid' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const duplicate = await isReferenceTaken(admin, proofReference, orderRef);
    if (duplicate) {
      return NextResponse.json(
        { error: 'This transfer reference was already used', code: 'instapay_reference_duplicate' },
        { status: 409 }
      );
    }

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
      if (error.code === '23505') {
        return NextResponse.json(
          {
            error: 'This transfer reference was already used',
            code: 'instapay_reference_duplicate',
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      orderRef: data.order_ref,
      screenshotUrl: data.screenshot_url,
    });
  } catch (err) {
    if (err instanceof ImageValidationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('instapay_proofs_post_failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
