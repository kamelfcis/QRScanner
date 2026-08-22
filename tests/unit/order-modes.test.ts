import { describe, expect, it } from 'vitest';
import {
  getFulfillmentOptions,
  getWelcomeCards,
  resolveOrderModes,
  validateOrderModes,
} from '@/lib/order/order-modes';

describe('resolveOrderModes', () => {
  it('defaults to dine-in + takeaway when settings are empty', () => {
    expect(resolveOrderModes(null)).toEqual({
      dineIn: true,
      takeaway: true,
      delivery: false,
    });
    expect(resolveOrderModes({})).toEqual({
      dineIn: true,
      takeaway: true,
      delivery: false,
    });
  });

  it('supports Aklet-style takeaway + delivery without dine-in', () => {
    expect(
      resolveOrderModes({
        enable_dine_in: false,
        enable_takeaway: true,
        enable_delivery: true,
      })
    ).toEqual({
      dineIn: false,
      takeaway: true,
      delivery: true,
    });
  });

  it('treats explicit false flags as disabled', () => {
    expect(
      resolveOrderModes({
        enable_dine_in: false,
        enable_takeaway: false,
        enable_delivery: false,
      })
    ).toEqual({
      dineIn: false,
      takeaway: false,
      delivery: false,
    });
  });
});

describe('getWelcomeCards', () => {
  it('shows dine-in and takeaway by default', () => {
    expect(getWelcomeCards(resolveOrderModes(null))).toEqual(['dine-in', 'takeaway']);
  });

  it('shows takeaway and delivery when dine-in is disabled', () => {
    expect(
      getWelcomeCards(
        resolveOrderModes({
          enable_dine_in: false,
          enable_takeaway: true,
          enable_delivery: true,
        })
      )
    ).toEqual(['takeaway', 'delivery']);
  });

  it('omits disabled cards when dine-in is enabled', () => {
    expect(
      getWelcomeCards(
        resolveOrderModes({
          enable_dine_in: true,
          enable_takeaway: false,
        })
      )
    ).toEqual(['dine-in']);
  });
});

describe('getFulfillmentOptions', () => {
  it('maps takeaway and delivery flags to checkout options', () => {
    expect(getFulfillmentOptions(resolveOrderModes(null))).toEqual(['pickup']);
    expect(
      getFulfillmentOptions(
        resolveOrderModes({
          enable_dine_in: false,
          enable_takeaway: true,
          enable_delivery: true,
        })
      )
    ).toEqual(['pickup', 'delivery']);
    expect(
      getFulfillmentOptions(
        resolveOrderModes({
          enable_dine_in: false,
          enable_takeaway: false,
          enable_delivery: true,
        })
      )
    ).toEqual(['delivery']);
  });
});

describe('validateOrderModes', () => {
  it('requires at least one enabled mode', () => {
    expect(validateOrderModes(resolveOrderModes(null))).toBe(true);
    expect(
      validateOrderModes(
        resolveOrderModes({
          enable_dine_in: false,
          enable_takeaway: false,
          enable_delivery: false,
        })
      )
    ).toBe(false);
  });
});
