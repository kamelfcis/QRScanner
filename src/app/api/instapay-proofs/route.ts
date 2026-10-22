import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { EcommerceCartValidationItem } from '@/lib/catalog/validate-ecommerce-cart';
import { isValidInstapayReference, normalizeInstapayReference } from '@/lib/payment/instapay-proof';
import { instapayPaymentUrl } from '@/lib/payment/instapay';
import { buildDeliveryProofRecord, paymentProofBlockReason } from '@/lib/payment/prepaid';
import { resolvePrepaidProof } from '@/lib/payment/resolve-prepaid-proof';
import { ImageValidationError, validateImageFile } from '@/lib/upload-validation';

const BUCKET = 'instapay-proofs';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 80);
}

function parseProofItems(raw: FormDataEntryValue | null): EcommerceCartValidationItem[] | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const items: EcommerceCartValidationItem[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') return null;
    const record = entry as Record<string, unknown>;
    const productId = typeof record.productId === 'string' ? record.productId.trim() : '';
    const quantity = Number(record.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) return null;
    const sizeCode =
      typeof record.sizeCode === 'string' && record.sizeCode.trim() ? record.sizeCode.trim() : null;
    items.push({ productId, quantity, sizeCode, notes: null });
  }
  return items;
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
    const amountNote = String(formData.get('amountNote') ?? '').trim() || null;
    const customerName = String(formData.get('customerName') ?? '').trim();
    const customerPhone = String(formData.get('customerPhone') ?? '').trim() || null;
    const deliveryLocationId = String(formData.get('deliveryLocationId') ?? '').trim() || null;
    const paymentMethod = String(formData.get('paymentMethod') ?? '').trim() || null;
    const prepaidScope = String(formData.get('prepaidScope') ?? '').trim() || null;
    const markWhatsAppSent = formData.get('markWhatsAppSent') === 'true';
    const items = parseProofItems(formData.get('items'));
    if (formData.get('items') && !items) {
      return NextResponse.json(
        { error: 'Invalid cart items', code: 'invalid_items' },
        { status: 400 }
      );
    }

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

    const admin = createAdminClient();
    const resolved = await resolvePrepaidProof(admin, {
      deliveryLocationId,
      paymentMethod,
      prepaidScope,
      items,
      envInstapayUrl: instapayPaymentUrl,
    });
    if (!resolved.ok) {
      if (uploadOnly && screenshotUrl) {
        return NextResponse.json({ screenshotUrl, path: storedPath });
      }
      return NextResponse.json(
        { error: resolved.error, code: resolved.code },
        { status: resolved.status }
      );
    }

    const proof = resolved.value;
    if (uploadOnly) {
      if (!screenshotUrl) {
        return NextResponse.json(
          { error: 'Screenshot upload failed', code: 'instapay_upload_failed' },
          { status: 400 }
        );
      }
    } else if (!customerName) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    } else {
      const blocked = paymentProofBlockReason(proof.proofRequired, screenshotUrl);
      if (blocked) {
        return NextResponse.json(
          { error: 'Payment screenshot is required', code: blocked },
          { status: 400 }
        );
      }
      if (!proof.proofRequired) {
        return NextResponse.json({ proofRequired: false });
      }
    }

    const row = buildDeliveryProofRecord({
      orderRef,
      customerName: customerName || 'Pending',
      customerPhone,
      deliveryLocationId: proof.deliveryLocationId,
      screenshotUrl,
      amountNote,
      paymentMethod: proof.paymentMethod,
      prepaidScope: proof.prepaidScope,
      productsTotal: proof.productsTotal,
      deliveryFee: proof.deliveryFee,
      amountDue: proof.amountDue,
      remainingOnDelivery: proof.remainingOnDelivery,
      markWhatsAppSent: !uploadOnly && markWhatsAppSent,
    });

    const { data, error } = await admin
      .from('instapay_delivery_proofs')
      .upsert(row, { onConflict: 'order_ref' })
      .select(
        'id, order_ref, screenshot_url, payment_method, prepaid_scope, products_total, delivery_fee, amount_due, remaining_on_delivery'
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const grandTotal =
      Math.round((Number(data.products_total) + Number(data.delivery_fee)) * 100) / 100;

    return NextResponse.json({
      id: data.id,
      orderRef: data.order_ref,
      screenshotUrl: data.screenshot_url,
      path: storedPath,
      proofRequired: proof.proofRequired,
      paymentMethod: data.payment_method,
      prepaidScope: data.prepaid_scope,
      productsTotal: Number(data.products_total),
      deliveryFee: Number(data.delivery_fee),
      grandTotal,
      amountDue: Number(data.amount_due),
      remainingOnDelivery: Number(data.remaining_on_delivery),
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
