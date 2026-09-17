import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

describe('035_discount_engine_coupons.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/035_discount_engine_coupons.sql'),
    'utf8'
  );

  it('adds automatic and BOGO coupon columns', () => {
    expect(sql).toMatch(/requires_code BOOLEAN/);
    expect(sql).toMatch(/is_stackable BOOLEAN/);
    expect(sql).toMatch(/bogo_buy INTEGER/);
    expect(sql).toMatch(/bogo_get INTEGER/);
    expect(sql).toMatch(/discount_type IN \('percentage', 'fixed', 'bogo'\)/);
  });

  it('defines cart-aware discount resolution', () => {
    expect(sql).toMatch(/evaluate_order_discounts/);
    expect(sql).toMatch(/coupon_compute_amount/);
    expect(sql).toMatch(/preview_customer_coupon/);
    expect(sql).toMatch(/place_customer_order/);
    expect(sql).toMatch(/place_staff_order/);
  });

  it('locks TS goldens in SQL comments', () => {
    expect(sql).toMatch(/bogo-buy2-get1-qty3\s+=> 10/);
    expect(sql).toMatch(/code-stackable-plus-auto\s+=> 15/);
  });
});

describe('034_push_subscriptions.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/034_push_subscriptions.sql'),
    'utf8'
  );

  it('creates push_subscriptions with simple user-owned RLS', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.push_subscriptions/);
    expect(sql).toMatch(/user_id = \(SELECT auth\.uid\(\)\)/);
    expect(sql).not.toMatch(/staff_profiles/);
  });
});
