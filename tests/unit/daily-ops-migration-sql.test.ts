import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('037_daily_ops_payment_void.sql', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/037_daily_ops_payment_void.sql'),
    'utf8'
  );

  it('adds payment columns and staff RPCs', () => {
    expect(sql).toMatch(/payment_method/);
    expect(sql).toMatch(/close_order_payment/);
    expect(sql).toMatch(/void_order_item/);
    expect(sql).toMatch(/void_order/);
    expect(sql).toMatch(/assert_order_not_in_closed_shift/);
  });

  it('grants execute to authenticated only', () => {
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.close_order_payment(uuid, text, numeric) TO authenticated'
    );
    expect(sql).not.toContain('TO anon, authenticated');
  });
});
