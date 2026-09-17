import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('030_tier2_ops_settings.sql', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/030_tier2_ops_settings.sql'),
    'utf8'
  );

  it('adds ready_whatsapp_sent_at and seeds tier 2 settings keys', () => {
    expect(sql).toMatch(/ready_whatsapp_sent_at/);
    expect(sql).toMatch(/auto_print_kitchen_ticket/);
    expect(sql).toMatch(/whatsapp_on_ready/);
  });
});
