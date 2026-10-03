export const tenant = process.env.NEXT_PUBLIC_TENANT?.trim().toLowerCase();

export const isOstolTenant = tenant === 'ostol';

export const showLinkPage = isOstolTenant || process.env.NEXT_PUBLIC_ENABLE_LINK_PAGE === 'true';

export const OSTOL_ONLY_DASHBOARD_NAV_KEYS = new Set(['linkPage']);

export const LINK_PAGE_DASHBOARD_PATH = '/dashboard/link-page';
