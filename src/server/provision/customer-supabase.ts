import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CustomerSecrets, TemplateType } from '@/lib/engaz/types';
import { CUSTOMER_MIGRATIONS } from '@/server/provision/migrations-data';
import {
  buildHoursSettings,
  buildRestaurantSettings,
  buildThemeSettings,
} from '@/server/templates/settings';

const MANAGEMENT_API = 'https://api.supabase.com';

export function createCustomerClient(secrets: CustomerSecrets): SupabaseClient {
  return createClient(secrets.supabaseUrl, secrets.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function validateCustomerSupabase(secrets: CustomerSecrets): Promise<void> {
  const client = createCustomerClient(secrets);
  const { error } = await client.from('settings').select('key').limit(1);
  if (error && /Invalid API key|JWT|project/i.test(error.message)) {
    throw new Error(`Customer Supabase unreachable: ${error.message}`);
  }

  const res = await fetch(`${MANAGEMENT_API}/v1/projects/${secrets.supabaseProjectRef}`, {
    headers: {
      Authorization: `Bearer ${secrets.supabaseAccessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase Management API project check failed (${res.status}): ${body}`);
  }
}

async function runSql(secrets: CustomerSecrets, query: string): Promise<void> {
  const res = await fetch(
    `${MANAGEMENT_API}/v1/projects/${secrets.supabaseProjectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secrets.supabaseAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SQL failed (${res.status}): ${body.slice(0, 800)}`);
  }
}

export function listCustomerMigrationFiles(): Array<{ name: string; sql: string }> {
  return CUSTOMER_MIGRATIONS;
}

export async function applyCustomerMigrations(
  secrets: CustomerSecrets,
  onProgress?: (file: string) => void
): Promise<string[]> {
  const files = listCustomerMigrationFiles();
  const applied: string[] = [];
  for (const file of files) {
    onProgress?.(file.name);
    await runSql(secrets, file.sql);
    applied.push(file.name);
  }
  return applied;
}

export async function seedEmptyMenu(
  secrets: CustomerSecrets,
  input: {
    templateType: TemplateType;
    displayNameAr: string;
    displayNameEn: string;
  }
): Promise<void> {
  const client = createCustomerClient(secrets);

  await client.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await client.from('subcategories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await client.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  try {
    await runSql(
      secrets,
      `
      truncate table public.products restart identity cascade;
      truncate table public.subcategories restart identity cascade;
      truncate table public.categories restart identity cascade;
      `
    );
  } catch {
    // fallback deletes already attempted
  }

  const restaurant = buildRestaurantSettings(input);
  const theme = buildThemeSettings(input.templateType);
  const hours = buildHoursSettings();

  for (const [key, value] of [
    ['restaurant', restaurant],
    ['theme', theme],
    ['hours', hours],
  ] as const) {
    const { error } = await client.from('settings').upsert(
      {
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
    if (error) {
      await runSql(
        secrets,
        `
        insert into public.settings (key, value)
        values ('${key}', '${JSON.stringify(value).replace(/'/g, "''")}'::jsonb)
        on conflict (key) do update set value = excluded.value, updated_at = now();
        `
      );
    }
  }
}

export async function createCustomerAdminUser(
  secrets: CustomerSecrets,
  email: string,
  password: string
): Promise<string> {
  const client = createCustomerClient(secrets);
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
  });
  if (error) {
    if (/already|exists|registered/i.test(error.message)) {
      const listed = await client.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = listed.data.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (!existing) throw error;
      const { error: updErr } = await client.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        app_metadata: { ...(existing.app_metadata || {}), role: 'admin' },
      });
      if (updErr) throw updErr;
      return existing.id;
    }
    throw error;
  }
  if (!data.user?.id) throw new Error('createUser returned no user id');
  return data.user.id;
}
