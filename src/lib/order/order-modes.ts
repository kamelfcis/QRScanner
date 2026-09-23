import type { RestaurantSettings } from '@/types/database';
import type { FulfillmentType } from '@/stores/cart-store';

export type OrderModes = {
  dineIn: boolean;
  takeaway: boolean;
  delivery: boolean;
};

export type WelcomeCardId = 'dine-in' | 'takeaway' | 'delivery';

export function resolveOrderModes(settings?: Partial<RestaurantSettings> | null): OrderModes {
  return {
    dineIn: settings?.enable_dine_in !== false,
    takeaway: settings?.enable_takeaway !== false,
    delivery: settings?.enable_delivery === true,
  };
}

/** Segmented control on `/menu` when dine-in is enabled (mirrors welcome cards). */
export function getMenuModeToggleOptions(modes: OrderModes): WelcomeCardId[] {
  if (!modes.dineIn) return [];
  return getWelcomeCards(modes);
}

export function shouldShowMenuModeToggle(modes: OrderModes): boolean {
  return getMenuModeToggleOptions(modes).length >= 2;
}

/** Map cart state to the active menu toggle segment. */
export function resolveMenuModeToggleSelection(
  modes: OrderModes,
  diningMode: 'dining' | 'takeaway',
  fulfillmentType: FulfillmentType
): WelcomeCardId {
  if (diningMode === 'dining') return 'dine-in';
  if (modes.delivery && fulfillmentType === 'delivery') return 'delivery';
  return 'takeaway';
}

/** Apply a menu toggle segment (same semantics as welcome cards). */
export function applyMenuModeToggleSelection(cardId: WelcomeCardId): {
  diningMode: 'dining' | 'takeaway';
  fulfillmentType: FulfillmentType | null;
} {
  switch (cardId) {
    case 'dine-in':
      return { diningMode: 'dining', fulfillmentType: null };
    case 'takeaway':
      return { diningMode: 'takeaway', fulfillmentType: 'pickup' };
    case 'delivery':
      return { diningMode: 'takeaway', fulfillmentType: 'delivery' };
  }
}

/** Which cards to render on `/welcome`. */
export function getWelcomeCards(modes: OrderModes): WelcomeCardId[] {
  if (modes.dineIn) {
    const cards: WelcomeCardId[] = ['dine-in'];
    if (modes.takeaway) cards.push('takeaway');
    else if (modes.delivery) cards.push('delivery');
    return cards;
  }

  const cards: WelcomeCardId[] = [];
  if (modes.takeaway) cards.push('takeaway');
  if (modes.delivery) cards.push('delivery');
  return cards;
}

/** Pickup/delivery options available at checkout for takeaway orders. */
export function getFulfillmentOptions(modes: OrderModes): FulfillmentType[] {
  const options: FulfillmentType[] = [];
  if (modes.takeaway) options.push('pickup');
  if (modes.delivery) options.push('delivery');
  return options;
}

/** At least one order mode must stay enabled. */
export function validateOrderModes(modes: OrderModes): boolean {
  return modes.dineIn || modes.takeaway || modes.delivery;
}
