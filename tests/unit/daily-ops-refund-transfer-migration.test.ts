import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('040_daily_ops_refund_transfer.sql', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/040_daily_ops_refund_transfer.sql'),
    'utf8'
  );

  it('adds refund columns and index', () => {
    expect(sql).toMatch(/refunded_at TIMESTAMPTZ/);
    expect(sql).toMatch(/refund_reason TEXT/);
    expect(sql).toMatch(/idx_orders_refunded_at/);
  });

  it('allows table_number change via transfer bypass', () => {
    expect(sql).toMatch(/warda\.order_table_transfer/);
    expect(sql).toMatch(/IF NOT v_table_transfer THEN/);
  });

  it('defines refund and transfer RPCs with authenticated grants', () => {
    expect(sql).toMatch(/refund_order_payment/);
    expect(sql).toMatch(/transfer_order_table/);
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.refund_order_payment(uuid, text) TO authenticated'
    );
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.transfer_order_table(uuid, text) TO authenticated'
    );
  });

  it('blocks void on paid orders and keeps payment audit on refund', () => {
    expect(sql).toMatch(/IF v_order\.paid_at IS NOT NULL THEN[\s\S]*already_paid/);
    expect(sql).toMatch(/refunded_at = now\(\)/);
    expect(sql).not.toMatch(/payment_method := NULL/);
  });
});
