import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { CUSTOMER_COOKIE_NAME, verifyCustomerCookie } from '@/lib/customer/cookie';

export async function getCustomerIdFromCookie(): Promise<string | null> {
  const store = await cookies();
  return verifyCustomerCookie(store.get(CUSTOMER_COOKIE_NAME)?.value);
}

export async function getCustomerAccount() {
  const customerId = await getCustomerIdFromCookie();
  if (!customerId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('customer_get_account', {
    p_customer_id: customerId,
  });
  if (error) return null;
  return data as {
    id: string;
    phone_normalized: string;
    first_name: string;
    display_name: string | null;
    points_balance: number;
  };
}
