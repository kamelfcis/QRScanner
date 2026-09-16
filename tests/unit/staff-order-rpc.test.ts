import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

describe('place_staff_order migration SQL', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/026_place_staff_order.sql'),
    'utf8'
  );

  it('loads products in one set-based join (no per-item SELECT loop)', () => {
    expect(sql).toContain("jsonb_array_elements(payload->'items')");
    expect(sql).toContain('JOIN public.products');
    expect(sql).not.toMatch(
      /FOR v_item IN[\s\S]*SELECT \* INTO v_product[\s\S]*FROM public\.products/
    );
  });

  it('grants execute to authenticated only', () => {
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.place_staff_order(jsonb) TO authenticated'
    );
    expect(sql).not.toContain('TO anon, authenticated');
  });
});
