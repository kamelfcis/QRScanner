import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('039_daily_ops_coupon_recalc.sql', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/039_daily_ops_coupon_recalc.sql'),
    'utf8'
  );

  it('allows RPC bypass to update financial fields on orders', () => {
    expect(sql).toMatch(/IF NOT v_bypass THEN/);
    expect(sql).toMatch(/NEW\.subtotal := OLD\.subtotal/);
  });

  it('re-evaluates coupons when recalculating order totals', () => {
    expect(sql).toMatch(/evaluate_order_discounts/);
    expect(sql).toMatch(/coupon_id = v_coupon_id/);
    expect(sql).toMatch(/coupon_code = v_coupon_code/);
  });
});
