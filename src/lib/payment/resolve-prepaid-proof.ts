import type { SupabaseClient } from '@supabase/supabase-js';
import {
  validateEcommerceCartItems,
  type EcommerceCartValidationItem,
} from '@/lib/catalog/validate-ecommerce-cart';
import {
  computePrepaidAmounts,
  isPaymentMethod,
  isPrepaidScope,
  resolveConfiguredPaymentMethods,
  roundMoney,
  type PaymentMethod,
  type PrepaidAmounts,
  type PrepaidScope,
} from '@/lib/payment/prepaid';

const ZONE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ResolvedPrepaidProof extends PrepaidAmounts {
  proofRequired: boolean;
  paymentMethod: PaymentMethod;
  prepaidScope: PrepaidScope;
  deliveryLocationId: string | null;
}

export type ResolvePrepaidProofResult =
  | { ok: true; value: ResolvedPrepaidProof }
  | { ok: false; status: number; error: string; code: string };

type RestaurantPaymentSettings = {
  instapay_payment_url?: string | null;
  vodafone_cash_number?: string | null;
};

type ZoneRow = {
  id: string;
  delivery_fee: number | string;
  is_active: boolean;
};

function fail(status: number, error: string, code: string): ResolvePrepaidProofResult {
  return { ok: false, status, error, code };
}

export async function resolvePrepaidProof(
  admin: SupabaseClient,
  input: {
    deliveryLocationId: string | null;
    paymentMethod: string | null;
    prepaidScope: string | null;
    items: EcommerceCartValidationItem[] | null;
    envInstapayUrl?: string | null;
  }
): Promise<ResolvePrepaidProofResult> {
  const { data: settingsRow, error: settingsError } = await admin
    .from('settings')
    .select('value')
    .eq('key', 'restaurant')
    .maybeSingle();

  if (settingsError) throw settingsError;

  const settings = (settingsRow?.value ?? {}) as RestaurantPaymentSettings;
  const configured = resolveConfiguredPaymentMethods({
    instapayPaymentUrl: settings.instapay_payment_url,
    vodafoneCashNumber: settings.vodafone_cash_number,
    envInstapayUrl: input.envInstapayUrl,
  });

  const zoneId = input.deliveryLocationId?.trim() || null;
  let zone: ZoneRow | null = null;

  if (zoneId) {
    if (!ZONE_ID.test(zoneId)) {
      return fail(400, 'Invalid delivery zone', 'invalid_delivery_zone');
    }
    const { data, error } = await admin
      .from('delivery_locations')
      .select('id, delivery_fee, is_active')
      .eq('id', zoneId)
      .maybeSingle();
    if (error) throw error;
    zone = (data as ZoneRow | null) ?? null;
    if (!zone || !zone.is_active) {
      return fail(400, 'Invalid delivery zone', 'invalid_delivery_zone');
    }
  } else if (configured.methods.length > 0) {
    return fail(400, 'Delivery zone is required', 'invalid_delivery_zone');
  }

  const fee = zone ? roundMoney(Number(zone.delivery_fee)) : 0;
  if (zone && (!Number.isFinite(fee) || fee < 0)) {
    return fail(400, 'Invalid delivery fee', 'invalid_delivery_zone');
  }

  const proofRequired = fee > 0 && configured.methods.length > 0;
  if (!proofRequired) {
    return {
      ok: true,
      value: {
        proofRequired: false,
        paymentMethod: 'instapay',
        prepaidScope: 'shipping_only',
        deliveryLocationId: zone?.id ?? null,
        ...computePrepaidAmounts(0, fee, 'shipping_only'),
        amountDue: 0,
        remainingOnDelivery: 0,
      },
    };
  }

  if (!input.paymentMethod || !isPaymentMethod(input.paymentMethod)) {
    return fail(400, 'Invalid payment method', 'invalid_payment_method');
  }
  if (!configured.methods.includes(input.paymentMethod)) {
    return fail(400, 'Payment method is not configured', 'invalid_payment_method');
  }
  if (!input.prepaidScope || !isPrepaidScope(input.prepaidScope)) {
    return fail(400, 'Invalid prepaid scope', 'invalid_prepaid_scope');
  }
  if (!input.items?.length) {
    return fail(400, 'Cart items are required', 'invalid_items');
  }

  const cart = await validateEcommerceCartItems(admin, input.items, { priceBasis: 'takeaway' });
  if (!cart.valid) {
    const code = cart.codes[0] ?? 'product_unavailable';
    const status = code === 'product_not_found' || code === 'product_unavailable' ? 409 : 400;
    return fail(status, 'Could not price this cart', code);
  }

  const productsTotal = roundMoney(
    cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );
  const amounts = computePrepaidAmounts(productsTotal, fee, input.prepaidScope);

  return {
    ok: true,
    value: {
      proofRequired: true,
      paymentMethod: input.paymentMethod,
      prepaidScope: input.prepaidScope,
      deliveryLocationId: zone?.id ?? null,
      ...amounts,
    },
  };
}
