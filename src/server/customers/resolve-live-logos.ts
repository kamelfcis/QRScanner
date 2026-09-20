import { unstable_cache } from 'next/cache';
import { decryptJson } from '@/lib/crypto/secrets';
import type { CustomerSecrets } from '@/lib/engaz/types';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createCustomerClient } from '@/server/provision/customer-supabase';

export const LIVE_LOGO_CACHE_TTL_SECONDS = 60;
const CONCURRENCY_LIMIT = 8;

function isCustomerSecrets(value: unknown): value is CustomerSecrets {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.supabaseUrl === 'string' && typeof record.supabaseServiceRoleKey === 'string'
  );
}

export function extractRestaurantLogoUrl(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const logoUrl = (value as { logo_url?: unknown }).logo_url;
  if (typeof logoUrl !== 'string') return null;
  const trimmed = logoUrl.trim();
  return trimmed || null;
}

export async function fetchLiveLogoFromCustomerDb(customerId: string): Promise<string | null> {
  const db = createServiceRoleClient();
  const { data: secretRow, error } = await db
    .from('customer_secrets')
    .select('ciphertext, iv, auth_tag')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error || !secretRow) return null;

  let secrets: unknown;
  try {
    secrets = decryptJson({
      ciphertext: secretRow.ciphertext,
      iv: secretRow.iv,
      authTag: secretRow.auth_tag,
    });
  } catch {
    return null;
  }

  if (!isCustomerSecrets(secrets)) return null;

  try {
    const client = createCustomerClient(secrets);
    const { data, error: settingsError } = await client
      .from('settings')
      .select('value')
      .eq('key', 'restaurant')
      .maybeSingle();

    if (settingsError || !data?.value) return null;
    return extractRestaurantLogoUrl(data.value);
  } catch {
    return null;
  }
}

function getCachedLiveLogoUrl(customerId: string): Promise<string | null> {
  return unstable_cache(
    () => fetchLiveLogoFromCustomerDb(customerId),
    ['customer-live-logo', customerId],
    {
      revalidate: LIVE_LOGO_CACHE_TTL_SECONDS,
      tags: [`customer-live-logo-${customerId}`],
    }
  )();
}

async function mapWithConcurrency<T>(
  ids: string[],
  limit: number,
  fn: (id: string) => Promise<T>
): Promise<Map<string, T>> {
  const results = new Map<string, T>();
  let index = 0;

  async function worker() {
    while (index < ids.length) {
      const current = index;
      index += 1;
      const id = ids[current];
      results.set(id, await fn(id));
    }
  }

  const workers = Math.min(limit, ids.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

export async function resolveLiveLogos(customerIds: string[]): Promise<Map<string, string | null>> {
  const uniqueIds = [...new Set(customerIds.filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  return mapWithConcurrency(uniqueIds, CONCURRENCY_LIMIT, getCachedLiveLogoUrl);
}
