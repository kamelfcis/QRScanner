import { isEcommerceStore } from '@/lib/store-config';

type TranslatorValues = Record<string, string | number | Date>;
type Translator = (key: string, values?: TranslatorValues) => string;

/** Product vs dish wording — Mazen Store uses *Store keys when present. */
export function productTerm(t: Translator, key: string, values?: TranslatorValues): string {
  if (isEcommerceStore) {
    const storeKey = `${key}Store`;
    const storeText = t(storeKey, values);
    if (storeText !== storeKey && !storeText.endsWith(`.${storeKey}`)) {
      return storeText;
    }
  }
  return t(key, values);
}
