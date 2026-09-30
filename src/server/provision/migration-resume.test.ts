import { describe, expect, it } from 'vitest';
import { listCustomerMigrationFiles } from '@/server/provision/customer-supabase';
import { MIGRATION_PROBE_SQL } from '@/server/provision/migration-resume';

describe('migration resume probes', () => {
  it('has a probe for every schema migration file', () => {
    const files = listCustomerMigrationFiles();
    for (const file of files) {
      expect(MIGRATION_PROBE_SQL[file.name], file.name).toBeTruthy();
    }
  });
});
