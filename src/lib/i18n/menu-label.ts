import { isEcommerceStore } from '@/lib/store-config';

type Translator = (key: string) => string;

/** Sidebar item label. Restaurant mode uses القائمة / Menu for the menu hub. */
export function sidebarItemLabel(t: Translator, key: string): string {
  if (key === 'menu' && !isEcommerceStore) return t('menuRestaurant');
  return t(key);
}

/** Public nav label for the menu/shop entry. */
export function publicMenuLabel(t: Translator): string {
  return isEcommerceStore ? t('menu') : t('menuRestaurant');
}
