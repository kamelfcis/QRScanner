import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('038_daily_ops_order_edit.sql', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/038_daily_ops_order_edit.sql'),
    'utf8'
  );

  it('adds edit RPCs and recalculates totals on void', () => {
    expect(sql).toMatch(/recalculate_order_totals/);
    expect(sql).toMatch(/update_order_item_quantity/);
    expect(sql).toMatch(/append_items_to_order/);
    expect(sql).toMatch(/assert_order_editable/);
    expect(sql).toMatch(/PERFORM public\.recalculate_order_totals\(v_order_id\)/);
  });

  it('grants execute to authenticated only', () => {
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.update_order_item_quantity(uuid, integer) TO authenticated'
    );
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.append_items_to_order(uuid, jsonb) TO authenticated'
    );
    expect(sql).not.toContain('TO anon, authenticated');
  });
});
