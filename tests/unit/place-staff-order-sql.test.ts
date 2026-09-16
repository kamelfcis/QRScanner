import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('place_staff_order SQL', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/026_place_staff_order.sql'),
    'utf8'
  );

  it('is authenticated-only and skips customer rate limits', () => {
    expect(sql).toMatch(/auth\.uid\(\)/);
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.place_staff_order\(jsonb\) TO authenticated/
    );
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.place_staff_order\(jsonb\) TO anon/);
    expect(sql).not.toMatch(/order_place_attempts/);
  });

  it('loads products with a set-based JOIN instead of per-item SELECT', () => {
    expect(sql).toMatch(/LEFT JOIN public\.products/i);
    expect(sql).not.toMatch(/FROM public\.products\s+WHERE id\s*=/i);
    expect(sql).toMatch(/price_per_kg \* v_weight/);
    expect(sql).toMatch(/resolve_coupon_discount/);
    expect(sql).toMatch(/delivery_locations/);
  });
});
