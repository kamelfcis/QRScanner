import type { ProductOptionGroup, ProductOptionItem, SelectedOption } from '@/types/database';

export type ProductWithOptionGroups = {
  option_groups?: ProductOptionGroup[] | null;
};

export function getAvailableOptionGroups(product: ProductWithOptionGroups): ProductOptionGroup[] {
  return (product.option_groups ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((group) => ({
      ...group,
      items: (group.items ?? [])
        .filter((item) => item.is_available)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((group) => group.items.length > 0);
}

export function productHasChoiceGroups(product: ProductWithOptionGroups): boolean {
  return getAvailableOptionGroups(product).length > 0;
}

export function getDefaultSelectedOptions(product: ProductWithOptionGroups): SelectedOption[] {
  const selected: SelectedOption[] = [];
  for (const group of getAvailableOptionGroups(product)) {
    const items = group.items ?? [];
    const defaults = items.filter((item) => item.is_default);
    const picks =
      group.selection_type === 'single'
        ? (defaults[0] ?? items[0] ?? null)
          ? [defaults[0] ?? items[0]!]
          : []
        : defaults.length > 0
          ? defaults.slice(0, Math.max(1, group.max_select))
          : [];
    for (const item of picks) {
      selected.push(toSelectedOption(group, item));
    }
  }
  return selected;
}

export function toSelectedOption(
  group: Pick<ProductOptionGroup, 'id' | 'name_ar' | 'name_en'>,
  item: Pick<ProductOptionItem, 'id' | 'name_ar' | 'name_en' | 'price_delta'>
): SelectedOption {
  return {
    group_id: group.id,
    group_name_ar: group.name_ar,
    group_name_en: group.name_en,
    item_id: item.id,
    name_ar: item.name_ar,
    name_en: item.name_en,
    price_delta: Number(item.price_delta) || 0,
  };
}

export function sumSelectedOptionsDelta(selected: SelectedOption[] | undefined): number {
  if (!selected?.length) return 0;
  return selected.reduce((sum, option) => sum + (Number(option.price_delta) || 0), 0);
}

export function selectedOptionsKey(selected: SelectedOption[] | undefined): string {
  if (!selected?.length) return '';
  return [...selected.map((o) => o.item_id)].sort().join(',');
}

export function isOptionSelected(selected: SelectedOption[], itemId: string): boolean {
  return selected.some((option) => option.item_id === itemId);
}

export function toggleMultiOption(
  group: ProductOptionGroup,
  item: ProductOptionItem,
  selected: SelectedOption[]
): SelectedOption[] {
  const withoutGroup = selected.filter((option) => option.group_id !== group.id);
  const inGroup = selected.filter((option) => option.group_id === group.id);

  if (isOptionSelected(inGroup, item.id)) {
    return withoutGroup.concat(inGroup.filter((option) => option.item_id !== item.id));
  }

  const nextInGroup = [...inGroup, toSelectedOption(group, item)];
  if (nextInGroup.length > group.max_select) {
    return withoutGroup.concat(nextInGroup.slice(-group.max_select));
  }
  return withoutGroup.concat(nextInGroup);
}

export function setSingleOption(
  group: ProductOptionGroup,
  item: ProductOptionItem,
  selected: SelectedOption[]
): SelectedOption[] {
  const withoutGroup = selected.filter((option) => option.group_id !== group.id);
  return [...withoutGroup, toSelectedOption(group, item)];
}

export function validateSelectedOptions(
  product: ProductWithOptionGroups,
  selected: SelectedOption[]
): boolean {
  const groups = getAvailableOptionGroups(product);
  for (const group of groups) {
    const picks = selected.filter((option) => option.group_id === group.id);
    if (group.is_required && picks.length === 0) return false;
    if (group.selection_type === 'single' && picks.length > 1) return false;
    if (picks.length < group.min_select) return false;
    if (picks.length > group.max_select) return false;
    for (const pick of picks) {
      const valid = (group.items ?? []).some((item) => item.id === pick.item_id);
      if (!valid) return false;
    }
  }
  return true;
}

export function formatOptionPriceDelta(
  delta: number,
  formatAmount: (value: number) => string
): string | null {
  if (!delta) return null;
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${formatAmount(delta)}`;
}
