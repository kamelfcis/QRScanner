import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type LocalizedTextFields = {
  en: string;
  ar?: string | null;
  fr?: string | null;
  nl?: string | null;
};

/** Resolve display text: requested locale → English → Arabic. */
export function getLocalizedText(
  locale: string | undefined,
  fields: LocalizedTextFields,
  fallbackEn?: string
): string {
  const en = fields.en || fallbackEn || '';
  const ar = fields.ar || en;

  switch (locale) {
    case 'ar':
      return ar || en;
    case 'fr':
      return fields.fr || en || ar;
    case 'nl':
      return fields.nl || en || ar;
    default:
      return en || ar;
  }
}

/** @deprecated Prefer getLocalizedText with full field map. */
export function getName(
  locale: string | undefined,
  nameEn: string,
  nameAr: string | null | undefined,
  nameFr?: string | null,
  nameNl?: string | null
): string {
  return getLocalizedText(locale, {
    en: nameEn,
    ar: nameAr,
    fr: nameFr,
    nl: nameNl,
  });
}
