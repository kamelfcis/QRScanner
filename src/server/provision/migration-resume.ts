import type { CustomerSecrets } from '@/lib/engaz/types';
import { listCustomerMigrationFiles } from '@/server/provision/customer-supabase';

const MANAGEMENT_API = 'https://api.supabase.com';
const PROBE_TIMEOUT_MS = 15_000;

/** Lightweight existence checks — idempotent re-runs skip completed migration files. */
export const MIGRATION_PROBE_SQL: Record<string, string> = {
  '001_initial_schema.sql': `
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'categories'
    limit 1`,
  '002_rls_policies.sql': `
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'categories' and policyname = 'Public read categories'
    limit 1`,
  '004_qr_system.sql': `
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'restaurant_tables'
    limit 1`,
  '005_menu_import.sql': `
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'import_jobs'
    limit 1`,
  '006_testimonials.sql': `
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'testimonials'
    limit 1`,
  '007_analytics_enhanced.sql': `
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'search_analytics'
    limit 1`,
  '008_analytics_hardening.sql': `
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'track_search_event'
    limit 1`,
  '009_ordering_analytics.sql': `
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'track_analytics_event'
      and pg_get_functiondef(p.oid) like '%add_to_cart%'
    limit 1`,
  '010_storage_image_buckets_rls.sql': `
    select 1 from storage.buckets b
    where b.id = 'logos'
      and exists (
        select 1 from pg_policies pol
        where pol.schemaname = 'storage' and pol.tablename = 'objects'
          and pol.policyname = 'Public read logos'
      )
    limit 1`,
};

async function probeMigration(secrets: CustomerSecrets, sql: string): Promise<boolean> {
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
        body: JSON.stringify({ query: sql }),
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      }
    );
  } catch {
    return false;
  }
  if (!res.ok) return false;
  try {
    const rows = (await res.json()) as unknown[];
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function detectAppliedMigrationFiles(secrets: CustomerSecrets): Promise<Set<string>> {
  const applied = new Set<string>();
  const files = listCustomerMigrationFiles();

  for (const file of files) {
    const probe = MIGRATION_PROBE_SQL[file.name];
    if (!probe) continue;
    if (await probeMigration(secrets, probe)) {
      applied.add(file.name);
    }
  }

  return applied;
}
