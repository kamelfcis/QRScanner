import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('028_delivery_location_min_order.sql', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/028_delivery_location_min_order.sql'),
    'utf8'
  );

  it('adds delivery_locations.minimum_order and top sellers RPC', () => {
    expect(sql).toMatch(/minimum_order NUMERIC/);
    expect(sql).toMatch(/get_top_selling_products/);
  });

  it('applies zone minimum in order RPCs', () => {
    expect(sql).toMatch(/v_location\.minimum_order/);
    expect(sql).toMatch(/place_customer_order/);
    expect(sql).toMatch(/place_staff_order/);
  });
});

describe('029_accepting_orders.sql', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/029_accepting_orders.sql'),
    'utf8'
  );

  it('seeds accepting_orders and blocks customer checkout when paused', () => {
    expect(sql).toMatch(/accepting_orders/);
    expect(sql).toMatch(/orders_closed/);
    expect(sql).not.toMatch(/place_staff_order/);
  });
});
