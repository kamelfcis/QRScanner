import { formatCurrencyNumber, toCurrencyLocale } from '@/lib/order/format-currency';
import { getLocalizedText } from '@/lib/utils';
import type { SelectedOption } from '@/types/database';

function parseSelectedOptions(raw: unknown): SelectedOption[] {
  let value = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value) || value.length === 0) return [];

  const options: SelectedOption[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Partial<SelectedOption>;
    const nameAr = typeof row.name_ar === 'string' ? row.name_ar : '';
    const nameEn = typeof row.name_en === 'string' ? row.name_en : '';
    const groupAr = typeof row.group_name_ar === 'string' ? row.group_name_ar : '';
    const groupEn = typeof row.group_name_en === 'string' ? row.group_name_en : '';
    if (!nameAr && !nameEn && !groupAr && !groupEn) continue;
    const delta = Number(row.price_delta);
    options.push({
      group_id: typeof row.group_id === 'string' ? row.group_id : groupEn || groupAr,
      group_name_ar: groupAr,
      group_name_en: groupEn,
      item_id: typeof row.item_id === 'string' ? row.item_id : '',
      name_ar: nameAr,
      name_en: nameEn,
      price_delta: Number.isFinite(delta) ? delta : 0,
    });
  }
  return options;
}

function formatSignedDelta(delta: number, locale: string): string | null {
  if (!Number.isFinite(delta)) return null;
  const rounded = Math.round(delta * 100) / 100;
  if (rounded === 0) return null;
  const amount = formatCurrencyNumber(Math.abs(rounded), toCurrencyLocale(locale));
  return `${rounded > 0 ? '+' : '-'}${amount}`;
}

/** One receipt line per choice group. Empty when the item has no stored choices. */
export function formatSelectedOptionLines(selectedOptions: unknown, locale: string): string[] {
  const options = parseSelectedOptions(selectedOptions);
  if (options.length === 0) return [];

  const groups: { name: string; choices: string[] }[] = [];
  const indexByGroup = new Map<string, number>();

  for (const option of options) {
    const groupName = getLocalizedText(locale, {
      en: option.group_name_en,
      ar: option.group_name_ar,
    });
    const choiceName = getLocalizedText(locale, {
      en: option.name_en,
      ar: option.name_ar,
    });
    const signed = formatSignedDelta(option.price_delta, locale);
    const choice = [choiceName, signed].filter(Boolean).join(' ');
    if (!choice) continue;

    const key = option.group_id || groupName;
    const existing = indexByGroup.get(key);
    const group = existing == null ? undefined : groups[existing];
    if (!group) {
      indexByGroup.set(key, groups.length);
      groups.push({ name: groupName, choices: [choice] });
    } else {
      group.choices.push(choice);
    }
  }

  return groups.map((group) =>
    group.name ? `${group.name}: ${group.choices.join('، ')}` : group.choices.join('، ')
  );
}
