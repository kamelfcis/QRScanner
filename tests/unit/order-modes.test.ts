import { describe, expect, it } from 'vitest';
import {
  applyMenuModeToggleSelection,
  getFulfillmentOptions,
  getMenuModeToggleOptions,
  getWelcomeCards,
  resolveMenuModeToggleSelection,
  resolveOrderModes,
  shouldShowMenuModeToggle,
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

  it('shows dine-in only when takeaway and delivery are disabled', () => {
    expect(
      getWelcomeCards(
        resolveOrderModes({
          enable_dine_in: true,
          enable_takeaway: false,
        })
      )
    ).toEqual(['dine-in']);
  });

  it('shows dine-in and delivery when takeaway is disabled', () => {
    expect(
      getWelcomeCards(
        resolveOrderModes({
          enable_dine_in: true,
          enable_takeaway: false,
          enable_delivery: true,
        })
      )
    ).toEqual(['dine-in', 'delivery']);
  });
});

describe('getMenuModeToggleOptions', () => {
  it('mirrors welcome cards when dine-in is enabled', () => {
    expect(getMenuModeToggleOptions(resolveOrderModes(null))).toEqual(['dine-in', 'takeaway']);
    expect(
      getMenuModeToggleOptions(
        resolveOrderModes({
          enable_dine_in: true,
          enable_takeaway: false,
          enable_delivery: true,
        })
      )
    ).toEqual(['dine-in', 'delivery']);
  });

  it('returns empty when dine-in is disabled', () => {
    expect(
      getMenuModeToggleOptions(
        resolveOrderModes({
          enable_dine_in: false,
          enable_takeaway: true,
          enable_delivery: true,
        })
      )
    ).toEqual([]);
  });
});

describe('shouldShowMenuModeToggle', () => {
  it('shows only when two or more dine-in menu modes exist', () => {
    expect(shouldShowMenuModeToggle(resolveOrderModes(null))).toBe(true);
    expect(
      shouldShowMenuModeToggle(
        resolveOrderModes({
          enable_dine_in: true,
          enable_takeaway: false,
          enable_delivery: true,
        })
      )
    ).toBe(true);
    expect(
      shouldShowMenuModeToggle(
        resolveOrderModes({
          enable_dine_in: true,
          enable_takeaway: false,
        })
      )
    ).toBe(false);
  });
});

describe('resolveMenuModeToggleSelection', () => {
  it('maps cart state to toggle segments', () => {
    const alaKeefak = resolveOrderModes({
      enable_dine_in: true,
      enable_takeaway: false,
      enable_delivery: true,
    });
    expect(resolveMenuModeToggleSelection(alaKeefak, 'dining', 'pickup')).toBe('dine-in');
    expect(resolveMenuModeToggleSelection(alaKeefak, 'takeaway', 'delivery')).toBe('delivery');
    expect(resolveMenuModeToggleSelection(resolveOrderModes(null), 'takeaway', 'pickup')).toBe(
      'takeaway'
    );
  });
});

describe('applyMenuModeToggleSelection', () => {
  it('matches welcome card semantics', () => {
    expect(applyMenuModeToggleSelection('dine-in')).toEqual({
      diningMode: 'dining',
      fulfillmentType: null,
    });
    expect(applyMenuModeToggleSelection('takeaway')).toEqual({
      diningMode: 'takeaway',
      fulfillmentType: 'pickup',
    });
    expect(applyMenuModeToggleSelection('delivery')).toEqual({
      diningMode: 'takeaway',
      fulfillmentType: 'delivery',
    });
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
