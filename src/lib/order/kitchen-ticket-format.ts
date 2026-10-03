import { getLocalizedText } from '@/lib/utils';
import type { OrderWithItems } from '@/types/database';

export interface KitchenItemLine {
  quantity: number;
  name: string;
  sizeLabel: string | null;
  weightGrams: number | null;
  notes: string | null;
}

type KitchenCopy = (key: string) => string;

export function formatKitchenItemLine(
  item: OrderWithItems['items'][number],
  locale: string,
  t: KitchenCopy
): KitchenItemLine {
  const name = getLocalizedText(locale, {
    en: item.name_en,
    ar: item.name_ar,
    fr: item.name_fr,
    nl: item.name_nl,
  });

  const sizeLabel =
    item.size_option === 'small' ? t('small') : item.size_option === 'large' ? t('large') : null;

  return {
    quantity: item.quantity,
    name,
    sizeLabel,
    weightGrams: item.weight_grams ?? null,
    notes: item.notes ?? null,
  };
}

export function formatKitchenFulfillment(
  order: Pick<OrderWithItems, 'fulfillment_type' | 'dining_mode'>,
  t: KitchenCopy
): string {
  if (order.fulfillment_type === 'delivery') return t('delivery');
  if (order.fulfillment_type === 'pickup') return t('pickup');
  return order.dining_mode === 'dining' ? t('dining') : t('takeaway');
}
