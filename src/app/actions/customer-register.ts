'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { CUSTOMER_COOKIE_NAME, signCustomerId } from '@/lib/customer/cookie';
import { normalizeLocalPhone } from '@/lib/phone/normalize';
import { resolveCountryCode } from '@/lib/phone/country-dial';
import { isAlaKeefakTenant } from '@/i18n/config';

export async function quickRegisterCustomer(input: {
  phone: string;
  firstName: string;
  phoneCountry?: string;
}) {
  if (!isAlaKeefakTenant) {
    return { error: 'feature_disabled' as const };
  }

  const phoneNormalized = normalizeLocalPhone(
    input.phone,
    resolveCountryCode(input.phoneCountry ?? 'EG')
  );
  if (!phoneNormalized) {
    return { error: 'invalid_phone' as const };
  }

  const supabase = await createClient();
  const { data: customerId, error } = await supabase.rpc('customer_upsert_by_phone', {
    p_phone_normalized: phoneNormalized,
    p_first_name: input.firstName.trim(),
  });

  if (error || !customerId) {
    return { error: 'register_failed' as const };
  }

  const store = await cookies();
  store.set(CUSTOMER_COOKIE_NAME, signCustomerId(String(customerId)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  return { customerId: String(customerId) };
}

export async function clearCustomerSession() {
  const store = await cookies();
  store.delete(CUSTOMER_COOKIE_NAME);
}
