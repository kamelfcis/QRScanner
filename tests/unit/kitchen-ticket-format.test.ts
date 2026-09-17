import { describe, expect, it } from 'vitest';
import {
  formatKitchenFulfillment,
  formatKitchenItemLine,
} from '@/lib/order/kitchen-ticket-format';

const t = (key: string) =>
  (
    ({
      small: 'Small',
      large: 'Large',
      delivery: 'Delivery',
      pickup: 'Pickup',
      dining: 'Dine in',
      takeaway: 'Takeaway',
    }) as Record<string, string>
  )[key] ?? key;

describe('kitchen ticket formatters', () => {
  it('formats item lines with size and weight', () => {
    const line = formatKitchenItemLine(
      {
        id: '1',
        order_id: 'o1',
        product_id: null,
        name_en: 'Grilled chicken',
        name_ar: 'دجاج',
        name_fr: null,
        name_nl: null,
        quantity: 2,
        unit_price: 100,
        size_option: 'large',
        weight_grams: 500,
        notes: 'Extra lemon',
        image_url: null,
        created_at: '2026-09-17T10:00:00.000Z',
      },
      'en',
      t
    );

    expect(line).toEqual({
      quantity: 2,
      name: 'Grilled chicken',
      sizeLabel: 'Large',
      weightGrams: 500,
      notes: 'Extra lemon',
    });
  });

  it('omits prices from formatted kitchen lines', () => {
    const line = formatKitchenItemLine(
      {
        id: '1',
        order_id: 'o1',
        product_id: null,
        name_en: 'Sea bass',
        name_ar: 'قاروص',
        name_fr: null,
        name_nl: null,
        quantity: 1,
        unit_price: 250,
        size_option: null,
        weight_grams: 400,
        notes: null,
        image_url: null,
        created_at: '2026-09-17T10:00:00.000Z',
      },
      'en',
      t
    );

    expect(line).not.toHaveProperty('unit_price');
    expect(JSON.stringify(line)).not.toContain('250');
  });

  it('maps fulfillment and dining mode labels', () => {
    expect(
      formatKitchenFulfillment({ fulfillment_type: 'delivery', dining_mode: 'takeaway' }, t)
    ).toBe('Delivery');
    expect(formatKitchenFulfillment({ fulfillment_type: null, dining_mode: 'dining' }, t)).toBe(
      'Dine in'
    );
  });
});
