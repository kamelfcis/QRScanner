import { describe, expect, it } from 'vitest';
import { listCustomerMigrationFiles } from '@/server/provision/customer-supabase';

const SCHEMA_MIGRATIONS = [
  '001_initial_schema.sql',
  '002_rls_policies.sql',
  '004_qr_system.sql',
  '005_menu_import.sql',
  '006_testimonials.sql',
  '007_analytics_enhanced.sql',
  '008_analytics_hardening.sql',
  '009_ordering_analytics.sql',
  '010_storage_image_buckets_rls.sql',
];

/** Drop PL/pgSQL bodies so RPC inserts are not treated as content seeds. */
function sqlOutsideFunctions(sql: string): string {
  return sql.replace(/\$\$[\s\S]*?\$\$/g, '');
}

describe('listCustomerMigrationFiles', () => {
  it('keeps schema files and storage buckets, and skips content migrations', () => {
    const files = listCustomerMigrationFiles();
    expect(files.map((file) => file.name)).toEqual(SCHEMA_MIGRATIONS);
  });

  it('contains no INSERT INTO public content statements', () => {
    const files = listCustomerMigrationFiles();
    for (const file of files) {
      expect(sqlOutsideFunctions(file.sql), file.name).not.toMatch(/insert\s+into\s+public\./i);
    }

    const bucketFiles = files
      .filter((file) => /insert\s+into\s+storage\.buckets/i.test(file.sql))
      .map((file) => file.name);
    expect(bucketFiles).toEqual(['005_menu_import.sql', '010_storage_image_buckets_rls.sql']);
  });
});
