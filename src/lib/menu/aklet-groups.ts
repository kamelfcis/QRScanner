import type { CategoryWithProducts, Product } from '@/types/database';

/**
 * Editorial grouping for the Aklet catalogue. Purely presentational — the
 * categories in Supabase are untouched, we only label the sections so a
 * seventeen-category list reads like a menu instead of a dropdown.
 */
export type AkletGroupId = 'fish' | 'seafood' | 'plates' | 'cooking' | 'offers';

const GROUP_BY_ARABIC_NAME: Record<string, AkletGroupId> = {
  أسماك: 'fish',
  'أسماك بحرية': 'fish',
  'فيليه وأسماك فاخرة': 'fish',
  جمبري: 'seafood',
  حبار: 'seafood',
  كابوريا: 'seafood',
  محار: 'seafood',
  كافيار: 'seafood',
  شوربات: 'plates',
  مكرونة: 'plates',
  أرز: 'plates',
  سندوتشات: 'plates',
  'أطباق أرز': 'plates',
  وجبات: 'plates',
  سلطات: 'plates',
  تسوية: 'cooking',
  الصواني: 'offers',
};

const GROUP_BY_ENGLISH_KEYWORD: Array<[string, AkletGroupId]> = [
  ['fish', 'fish'],
  ['fillet', 'fish'],
  ['shrimp', 'seafood'],
  ['squid', 'seafood'],
  ['crab', 'seafood'],
  ['shellfish', 'seafood'],
  ['caviar', 'seafood'],
  ['soup', 'plates'],
  ['pasta', 'plates'],
  ['rice', 'plates'],
  ['sandwich', 'plates'],
  ['meal', 'plates'],
  ['salad', 'plates'],
  ['cooking', 'cooking'],
  ['grill', 'cooking'],
  ['fried', 'cooking'],
  ['tray', 'offers'],
];

export function getCategoryGroup(nameAr: string, nameEn: string): AkletGroupId | null {
  const exact = GROUP_BY_ARABIC_NAME[nameAr.trim()];
  if (exact) return exact;

  const english = nameEn.toLowerCase();
  const keyword = GROUP_BY_ENGLISH_KEYWORD.find(([needle]) => english.includes(needle));
  return keyword ? keyword[1] : null;
}

const SHRIMP_AR = 'جمبري';

export function isShrimpCategory(category: Pick<CategoryWithProducts, 'name_ar' | 'name_en'>) {
  return category.name_ar.includes(SHRIMP_AR) || category.name_en.toLowerCase().includes('shrimp');
}

/** Shrimp is the house signature — surface it whether it is tagged by category or by name. */
export function collectShrimpProducts(categories: CategoryWithProducts[], limit = 8): Product[] {
  const seen = new Set<string>();
  const picks: Product[] = [];

  const push = (product: Product) => {
    if (seen.has(product.id) || !product.is_available) return;
    seen.add(product.id);
    picks.push(product);
  };

  categories.filter(isShrimpCategory).forEach((category) => category.products.forEach(push));

  if (picks.length < limit) {
    categories.forEach((category) =>
      category.products.forEach((product) => {
        if (
          product.name_ar.includes(SHRIMP_AR) ||
          product.name_en.toLowerCase().includes('shrimp')
        ) {
          push(product);
        }
      })
    );
  }

  return picks.slice(0, limit);
}

/** Bestsellers first, then popular. Returns an empty list when no flags are set. */
export function collectBestsellers(categories: CategoryWithProducts[], limit = 6): Product[] {
  const all = categories.flatMap((category) => category.products).filter((p) => p.is_available);
  const bestsellers = all.filter((p) => p.is_bestseller);
  const popular = all.filter((p) => p.is_popular && !p.is_bestseller);
  return [...bestsellers, ...popular].slice(0, limit);
}

const TRAY_AR = 'صانية';

/** The saver tray is a promo, not a normal square card. */
export function findPromoTray(categories: CategoryWithProducts[]): Product | null {
  for (const category of categories) {
    const match = category.products.find(
      (product) =>
        product.is_available &&
        (product.name_ar.includes(TRAY_AR) || category.name_ar.includes('الصواني'))
    );
    if (match) return match;
  }
  return null;
}
