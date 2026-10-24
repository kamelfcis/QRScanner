import { isEcommerceStore } from '@/lib/store-config';

type TranslatorValues = Record<string, string | number | Date>;
type Translator = ((key: string, values?: TranslatorValues) => string) & {
  has?: (key: string) => boolean;
};

/** Product vs dish wording — Mazen Store uses *Store keys when present. */
export function productTerm(t: Translator, key: string, values?: TranslatorValues): string {
  if (isEcommerceStore) {
    const storeKey = `${key}Store`;
    if (typeof t.has === 'function' && t.has(storeKey)) {
      return t(storeKey, values);
    }
  }
  return t(key, values);
}
