import { describe, expect, it } from 'vitest';
import { formatSelectedOptionLines } from '@/lib/order/selected-option-lines';
import type { SelectedOption } from '@/types/database';

function option(
  partial: Partial<SelectedOption> & Pick<SelectedOption, 'group_id'>
): SelectedOption {
  return {
    group_name_ar: 'نوع العيش',
    group_name_en: 'Bread',
    item_id: 'item',
    name_ar: 'عيش أبيض',
    name_en: 'White bread',
    price_delta: 0,
    ...partial,
  };
}

describe('formatSelectedOptionLines', () => {
  it('returns one line per group and joins choices with an Arabic comma', () => {
    const lines = formatSelectedOptionLines(
      [
        option({ item_id: 'white', name_ar: 'عيش أبيض', name_en: 'White bread' }),
        option({ item_id: 'baladi', name_ar: 'عيش بلدي', name_en: 'Baladi bread' }),
        option({
          group_id: 'extras',
          group_name_ar: 'إضافات',
          group_name_en: 'Extras',
          item_id: 'cheese',
          name_ar: 'جبنة',
          name_en: 'Cheese',
          price_delta: 2,
        }),
        option({
          group_id: 'extras',
          group_name_ar: 'إضافات',
          group_name_en: 'Extras',
          item_id: 'olives',
          name_ar: 'زيتون',
          name_en: 'Olives',
          price_delta: -1.5,
        }),
      ],
      'ar'
    );

    expect(lines).toEqual(['نوع العيش: عيش أبيض، عيش بلدي', 'إضافات: جبنة +2، زيتون -1.50']);
  });

  it('localizes group and choice names and appends a signed delta', () => {
    expect(formatSelectedOptionLines([option({ item_id: 'white', price_delta: 2 })], 'en')).toEqual(
      ['Bread: White bread +2']
    );

    expect(
      formatSelectedOptionLines([option({ item_id: 'white', price_delta: -2 })], 'en')
    ).toEqual(['Bread: White bread -2']);
  });

  it('parses a JSON string once and shows nothing when choices are missing', () => {
    const stored = JSON.stringify([
      option({ item_id: 'white', name_ar: 'عيش أبيض', name_en: 'White bread' }),
    ]);

    expect(formatSelectedOptionLines(stored, 'ar')).toEqual(['نوع العيش: عيش أبيض']);
    expect(formatSelectedOptionLines(undefined, 'ar')).toEqual([]);
    expect(formatSelectedOptionLines(null, 'ar')).toEqual([]);
    expect(formatSelectedOptionLines([], 'en')).toEqual([]);
    expect(formatSelectedOptionLines('[]', 'en')).toEqual([]);
    expect(formatSelectedOptionLines('not-json', 'en')).toEqual([]);
  });
});
