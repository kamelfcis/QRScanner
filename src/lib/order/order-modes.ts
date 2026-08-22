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

/** Which cards to render on `/welcome`. */
export function getWelcomeCards(modes: OrderModes): WelcomeCardId[] {
  if (modes.dineIn) {
    const cards: WelcomeCardId[] = [];
    if (modes.dineIn) cards.push('dine-in');
    if (modes.takeaway) cards.push('takeaway');
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
