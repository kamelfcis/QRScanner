import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('042_staff_rbac.sql', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/042_staff_rbac.sql'),
    'utf8'
  );

  it('adds kitchen/custom roles and permission columns', () => {
    expect(sql).toMatch(/kitchen/);
    expect(sql).toMatch(/custom/);
    expect(sql).toMatch(/full_name/);
    expect(sql).toMatch(/permissions jsonb/);
    expect(sql).toMatch(/is_active boolean/);
    expect(sql).toMatch(/staff_can\(p_resource text, p_action text\)/);
  });

  it('defaults new signups to cashier instead of admin', () => {
    expect(sql).toMatch(/VALUES \(NEW\.id, 'cashier', true\)/);
    expect(sql).not.toMatch(/VALUES \(NEW\.id, 'admin'\)/);
  });

  it('keeps public catalog reads and tightens writes', () => {
    expect(sql).toMatch(/staff_can\('menu', 'update'\)/);
    expect(sql).toMatch(/staff_can\('orders', 'delete'\)/);
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.staff_can(text, text) TO authenticated'
    );
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.staff_can(text, text) FROM PUBLIC');
  });
});
