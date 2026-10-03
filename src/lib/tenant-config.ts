export const tenant = process.env.NEXT_PUBLIC_TENANT?.trim().toLowerCase();

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? '';
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? '';

export const isOstolTenant = tenant === 'ostol';

/** Ostol production is identified by host when NEXT_PUBLIC_TENANT is stale. */
export const isOstolHost = /ostol-seafood/i.test(siteUrl) || /ostol-seafood/i.test(appUrl);

export const showLinkPage =
  isOstolTenant || isOstolHost || process.env.NEXT_PUBLIC_ENABLE_LINK_PAGE === 'true';

/** Restaurant / link-page Ostol — not Mazen ecommerce. */
export const isOstolSite = process.env.NEXT_PUBLIC_STORE_MODE !== 'ecommerce' && showLinkPage;

export const THEME_STORAGE_KEY = isOstolSite ? 'ostol-seafood-theme' : 'mazen-store-b1eb-theme';

export const OSTOL_ONLY_DASHBOARD_NAV_KEYS = new Set(['linkPage']);

export const LINK_PAGE_DASHBOARD_PATH = '/dashboard/link-page';
