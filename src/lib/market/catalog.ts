import {
  Apple,
  Beef,
  Candy,
  Croissant,
  CupSoda,
  Fish,
  Milk,
  ShoppingBasket,
  Snowflake,
  Soup,
  Sparkles,
  SprayCan,
  Wheat,
  type LucideIcon,
} from 'lucide-react';

export type MarketCategoryKind =
  | 'dairy'
  | 'meat'
  | 'seafood'
  | 'produce'
  | 'bakery'
  | 'canned'
  | 'grains'
  | 'beverages'
  | 'snacks'
  | 'frozen'
  | 'household'
  | 'care'
  | 'other';

const KIND_KEYWORDS: Array<{ kind: MarketCategoryKind; en: string[]; ar: string[] }> = [
  { kind: 'dairy', en: ['dairy', 'cheese', 'milk', 'yog'], ar: ['ألبان', 'أجبان', 'جبن', 'حليب'] },
  {
    kind: 'meat',
    en: ['meat', 'poultry', 'chicken', 'beef'],
    ar: ['لحوم', 'لحم', 'دواجن', 'دجاج'],
  },
  { kind: 'seafood', en: ['fish', 'seafood'], ar: ['أسماك', 'سمك', 'بحرية'] },
  {
    kind: 'produce',
    en: ['fruit', 'vegetable', 'produce', 'veg'],
    ar: ['خضروات', 'خضار', 'فواكه', 'فاكهة'],
  },
  { kind: 'bakery', en: ['bakery', 'bread', 'pastr'], ar: ['مخبوزات', 'خبز', 'معجنات'] },
  { kind: 'canned', en: ['canned', 'sauce', 'preserve'], ar: ['معلبات', 'صلصات', 'مربى'] },
  {
    kind: 'grains',
    en: ['rice', 'pasta', 'grain', 'flour', 'legume'],
    ar: ['أرز', 'معكرونة', 'حبوب', 'دقيق', 'بقوليات'],
  },
  {
    kind: 'beverages',
    en: ['beverage', 'drink', 'juice', 'water'],
    ar: ['مشروبات', 'عصائر', 'مياه'],
  },
  {
    kind: 'snacks',
    en: ['sweet', 'snack', 'candy', 'chocolate', 'biscuit'],
    ar: ['حلويات', 'سناكس', 'شوكولاتة', 'بسكويت'],
  },
  { kind: 'frozen', en: ['frozen'], ar: ['مجمدات', 'مجمد'] },
  {
    kind: 'household',
    en: ['household', 'cleaning', 'detergent', 'home'],
    ar: ['منظفات', 'منزلية', 'تنظيف'],
  },
  {
    kind: 'care',
    en: ['personal care', 'care', 'hygiene', 'beauty'],
    ar: ['العناية', 'عناية', 'نظافة شخصية'],
  },
];

/** Classify a category by its stored name (never by guessed SKUs). */
export function getCategoryKind(
  nameEn?: string | null,
  nameAr?: string | null
): MarketCategoryKind {
  const en = (nameEn || '').toLowerCase();
  const ar = nameAr || '';

  for (const entry of KIND_KEYWORDS) {
    if (entry.en.some((word) => en.includes(word))) return entry.kind;
    if (entry.ar.some((word) => ar.includes(word))) return entry.kind;
  }
  return 'other';
}

const KIND_ICONS: Record<MarketCategoryKind, LucideIcon> = {
  dairy: Milk,
  meat: Beef,
  seafood: Fish,
  produce: Apple,
  bakery: Croissant,
  canned: Soup,
  grains: Wheat,
  beverages: CupSoda,
  snacks: Candy,
  frozen: Snowflake,
  household: SprayCan,
  care: Sparkles,
  other: ShoppingBasket,
};

export function getCategoryIcon(kind: MarketCategoryKind): LucideIcon {
  return KIND_ICONS[kind];
}

/**
 * Packaged goods are shot on white and must not be cropped; fresh counters
 * (produce, meat, fish, bakery) read better edge to edge.
 */
const COVER_KINDS = new Set<MarketCategoryKind>(['produce', 'meat', 'seafood', 'bakery']);

export function getCategoryImageFit(kind: MarketCategoryKind): 'cover' | 'contain' {
  return COVER_KINDS.has(kind) ? 'cover' : 'contain';
}

/** Fruits & vegetables get the one spare "fresh" surface in the catalog. */
export function isFreshKind(kind: MarketCategoryKind): boolean {
  return kind === 'produce';
}
