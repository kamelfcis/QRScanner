export const tenant = process.env.NEXT_PUBLIC_TENANT?.trim().toLowerCase();

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? '';
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? '';

export const isOstolTenant = tenant === 'ostol';

/** Restaurant link-page behavior follows the مخبوز host, same as the Ostol seafood host. */
export const isMakhbozHost =
  /makhboz\.engazqr\.com/i.test(siteUrl) || /makhboz\.engazqr\.com/i.test(appUrl);

/** Ostol production is identified by host when NEXT_PUBLIC_TENANT is stale. */
export const isOstolHost =
  isMakhbozHost || /ostol-seafood/i.test(siteUrl) || /ostol-seafood/i.test(appUrl);

export const showLinkPage =
  isOstolTenant || isOstolHost || process.env.NEXT_PUBLIC_ENABLE_LINK_PAGE === 'true';

/** Restaurant / link-page layout — not ecommerce. */
export const isOstolSite = process.env.NEXT_PUBLIC_STORE_MODE !== 'ecommerce' && showLinkPage;

export const THEME_STORAGE_KEY = isMakhbozHost
  ? 'makhboz-theme'
  : isOstolSite
    ? 'ostol-seafood-theme'
    : 'mazen-store-b1eb-theme';

export const OSTOL_ONLY_DASHBOARD_NAV_KEYS = new Set(['linkPage']);

export const LINK_PAGE_DASHBOARD_PATH = '/dashboard/link-page';
