import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CustomerSecrets } from '@/lib/engaz/types';
import { CUSTOMER_MIGRATIONS } from '@/server/provision/migrations-data';
import { splitSqlStatements } from '@/server/provision/split-sql';

const MANAGEMENT_API = 'https://api.supabase.com';
const SQL_STATEMENT_TIMEOUT_MS = 60_000;

/** Content seeds and settings backfills. Schema files 001, 002, and 004–010 still run. */
const SKIPPED_CONTENT_MIGRATIONS = new Set([
  '003_seed_data.sql',
  '011_theme_and_hero_settings.sql',
  '012_story_image_settings.sql',
  '013_contact_defaults_egypt.sql',
  '014_qr_target_settings.sql',
]);

const CONTENT_TABLES = [
  'products',
  'subcategories',
  'categories',
  'offers',
  'gallery',
  'testimonials',
  'settings',
] as const;

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

function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
}

async function runSql(secrets: CustomerSecrets, query: string, label = 'query'): Promise<void> {
  const statements = splitSqlStatements(query);
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index]!;
    let res: Response;
    try {
      res = await fetch(
        `${MANAGEMENT_API}/v1/projects/${secrets.supabaseProjectRef}/database/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secrets.supabaseAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: statement }),
          signal: AbortSignal.timeout(SQL_STATEMENT_TIMEOUT_MS),
        }
      );
    } catch (err) {
      if (isTimeoutError(err)) {
        throw new Error(
          `SQL timed out after ${SQL_STATEMENT_TIMEOUT_MS}ms in ${label} statement ${index + 1}/${statements.length}`
        );
      }
      throw err;
    }
    if (res.ok) continue;
    const body = await res.text();
    if (/already exists/i.test(body)) continue;
    throw new Error(
      `SQL failed (${res.status}) in ${label} statement ${index + 1}/${statements.length}: ${body.slice(0, 500)}`
    );
  }
}

export function listCustomerMigrationFiles(): Array<{ name: string; sql: string }> {
  return CUSTOMER_MIGRATIONS.filter((file) => !SKIPPED_CONTENT_MIGRATIONS.has(file.name));
}

export async function applyCustomerMigrations(
  secrets: CustomerSecrets,
  onProgress?: (message: string) => void | Promise<void>
): Promise<string[]> {
  const files = listCustomerMigrationFiles();
  const applied: string[] = [];
  for (const file of files) {
    const name = file.name.split(/[/\\]/).pop() ?? file.name;
    await onProgress?.(`Applying ${name}…`);
    await runSql(secrets, file.sql, file.name);
    await onProgress?.(`Applied ${name}`);
    applied.push(file.name);
  }
  return applied;
}

export async function seedEmptyMenu(secrets: CustomerSecrets): Promise<void> {
  const client = createCustomerClient(secrets);
  const deleteErrors: string[] = [];

  for (const table of CONTENT_TABLES) {
    const { error } = await client
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) deleteErrors.push(`${table}: ${error.message}`);
  }

  const truncate = `truncate table ${CONTENT_TABLES.map((table) => `public.${table}`).join(', ')} restart identity cascade;`;
  try {
    await runSql(secrets, truncate, 'clear content');
  } catch (err) {
    if (deleteErrors.length === 0) return;
    const sqlMessage = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to clear content tables. Deletes: ${deleteErrors.join('; ')}. SQL: ${sqlMessage}`
    );
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
