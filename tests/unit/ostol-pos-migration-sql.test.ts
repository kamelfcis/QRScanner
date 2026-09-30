import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('042_ostol_pos.sql', () => {
  const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/042_ostol_pos.sql'), 'utf8');

  it('adds Ostol POS tables and shift guard', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.shifts/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.stock_items/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.customers_public/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.product_offers/);
    expect(sql).toMatch(/assert_shift_open/);
    expect(sql).toMatch(/idx_shifts_one_open/);
  });

  it('hooks order RPCs without blocking public place_customer_order at start', () => {
    expect(sql).toMatch(/pos_finalize_order/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.place_staff_order/);
    const staffFn = sql.match(
      /CREATE OR REPLACE FUNCTION public\.place_staff_order[\s\S]*?^END;\n\$\$/m
    )?.[0];
    expect(staffFn).toMatch(/PERFORM public\.assert_shift_open\(\)/);
    const customerFn = sql.match(
      /CREATE OR REPLACE FUNCTION public\.place_customer_order[\s\S]*?^END;\n\$\$/m
    )?.[0];
    expect(customerFn).not.toMatch(/assert_shift_open/);
    expect(customerFn).toMatch(/pos_finalize_order/);
  });

  it('revokes mutating POS functions from public', () => {
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.pos_post_purchase(jsonb) FROM PUBLIC, anon, authenticated'
    );
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.pos_sales_report(timestamptz, timestamptz) TO authenticated'
    );
  });
});
