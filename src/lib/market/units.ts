/**
 * Pack-size extraction for the wholesale catalog.
 *
 * The importer stores pack size inside the product description
 * (e.g. "كرتونة 24 علبة", "500 جم", "2.5 kg"). We surface whatever is
 * already there and never invent a unit.
 */

const MEASURE_UNITS = [
  'كيلو',
  'كجم',
  'كغم',
  'جرام',
  'جم',
  'لتر',
  'مل',
  'مللي',
  'kg',
  'kgs',
  'gm',
  'gr',
  'gram',
  'grams',
  'ml',
  'ltr',
  'liter',
  'litre',
  'g',
  'l',
];

/** Container words strong enough to show on their own, without a number. */
const PACK_UNITS = [
  'كرتونة',
  'كرتون',
  'علبة',
  'عبوة',
  'كيس',
  'أكياس',
  'صندوق',
  'زجاجة',
  'درزن',
  'شوال',
  'جالون',
  'باكيت',
  'طبق',
  'carton',
  'ctn',
  'box',
  'pack',
  'packet',
  'bottle',
  'dozen',
  'sachet',
  'bag',
  'tray',
];

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ALL_UNITS_ALT = [...PACK_UNITS, ...MEASURE_UNITS].map(escapeForRegex).join('|');
const PACK_UNITS_ALT = PACK_UNITS.map(escapeForRegex).join('|');

const NUMBER = '\\d+(?:[.,]\\d+)?';
const START = '(?:^|[^\\p{L}\\p{N}])';
const END = '(?![\\p{L}\\p{N}])';

/** "كرتونة 24 علبة" / "box of 12 cans" */
const PACK_OF_RE = new RegExp(
  `${START}((?:${PACK_UNITS_ALT})\\s*(?:of\\s*|من\\s*)?${NUMBER}\\s*(?:${ALL_UNITS_ALT}))${END}`,
  'iu'
);

/** "500 جم" / "2.5 kg" / "24 علبة" */
const NUMBER_UNIT_RE = new RegExp(`${START}(${NUMBER}\\s*(?:${ALL_UNITS_ALT}))${END}`, 'iu');

/** Bare container word, e.g. "كرتونة" */
const BARE_PACK_RE = new RegExp(`${START}((?:${PACK_UNITS_ALT}))${END}`, 'iu');

const MAX_LABEL_LENGTH = 22;

/**
 * Extract a short pack-size label from a product description.
 * Returns null when the description carries no recognisable unit.
 */
export function parseUnitLabel(
  descriptionAr?: string | null,
  descriptionEn?: string | null,
  locale: 'ar' | 'en' = 'ar'
): string | null {
  const ordered = locale === 'ar' ? [descriptionAr, descriptionEn] : [descriptionEn, descriptionAr];

  for (const raw of ordered) {
    const text = raw?.replace(/\s+/g, ' ').trim();
    if (!text) continue;

    for (const pattern of [PACK_OF_RE, NUMBER_UNIT_RE, BARE_PACK_RE]) {
      const match = pattern.exec(text);
      const label = match?.[1]?.trim();
      if (label && label.length <= MAX_LABEL_LENGTH) return label;
    }
  }

  return null;
}
