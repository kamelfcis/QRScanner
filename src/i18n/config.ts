export const allLocales = ['ar', 'en', 'fr', 'nl'] as const;
export type Locale = (typeof allLocales)[number];

function parseEnabledLocales(): Locale[] {
  const fromEnv = process.env.NEXT_PUBLIC_ENABLED_LOCALES?.trim();
  if (fromEnv) {
    const parsed = fromEnv
      .split(',')
      .map((segment) => segment.trim())
      .filter((segment): segment is Locale => allLocales.includes(segment as Locale));
    if (parsed.length > 0) return parsed;
  }

  if (process.env.NEXT_PUBLIC_TENANT === 'aklet') {
    return ['ar', 'en'];
  }

  return [...allLocales];
}

/** Locales exposed in UI and persisted in cookies for this deployment. */
export const enabledLocales = parseEnabledLocales() as readonly Locale[];

/** @alias enabledLocales */
export const locales = enabledLocales;

/** When false, DB queries must not select name_fr/name_nl (tenants without migration 018). */
export const hasExtendedMenuLocales =
  enabledLocales.includes('fr') || enabledLocales.includes('nl');

/** When false, DB queries must not select has_size_options (tenants without migration 016). */
const tenant = process.env.NEXT_PUBLIC_TENANT;
export const hasProductSizeOptions = tenant !== 'aklet' && tenant !== 'harameen';

/** When false, hide landing "Signature Dishes" section (NEXT_PUBLIC_HIDE_FEATURED_DISHES=true). */
export const showLandingFeaturedDishes = process.env.NEXT_PUBLIC_HIDE_FEATURED_DISHES !== 'true';

/** When false, hide landing gallery preview (NEXT_PUBLIC_HIDE_LANDING_GALLERY=true). */
export const showLandingGallery = process.env.NEXT_PUBLIC_HIDE_LANDING_GALLERY !== 'true';

/** When true, featured section uses "items" copy instead of "dishes" (spices shops). */
export const useFeaturedItemsCopy = process.env.NEXT_PUBLIC_FEATURED_COPY === 'items';

function resolveDefaultLocale(): Locale {
  const fromEnv = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
  if (fromEnv && enabledLocales.includes(fromEnv as Locale)) {
    return fromEnv as Locale;
  }
  return enabledLocales.includes('ar') ? 'ar' : enabledLocales[0];
}

/** Per-deployment default; override with NEXT_PUBLIC_DEFAULT_LOCALE on Vercel. */
export const defaultLocale: Locale = resolveDefaultLocale();

export const rtlLocales: Locale[] = ['ar'];
export const isRtl = (locale: Locale) => rtlLocales.includes(locale);

export const localeNames: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
  fr: 'Français',
  nl: 'Nederlands',
};

export const localeFlags: Record<Locale, string> = {
  ar: '🇸🇦',
  en: '🇬🇧',
  fr: '🇫🇷',
  nl: '🇳🇱',
};

export function isValidLocale(locale: string): locale is Locale {
  return allLocales.includes(locale as Locale);
}

export function isEnabledLocale(locale: string): locale is Locale {
  return enabledLocales.includes(locale as Locale);
}
