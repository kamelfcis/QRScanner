import type { LinkPageLinkItem, LinkPageSettings } from '@/types';

const OSTOL_FACEBOOK = 'https://www.facebook.com/share/18yJx3VgWC/';
const OSTOL_INSTAGRAM = 'https://www.instagram.com/as.seafood/';
const OSTOL_TIKTOK = 'https://www.tiktok.com/@as.seafood';
const OSTOL_PHONE = '01127244074';

function linkItem(overrides: Partial<LinkPageLinkItem> & { enabled: boolean }): LinkPageLinkItem {
  return { enabled: overrides.enabled, url: overrides.url, value: overrides.value };
}

export function getDefaultLinkPageSettings(): LinkPageSettings {
  return {
    enabled: true,
    title_ar: 'أسطول سي فود',
    title_en: 'Ostol Seafood',
    subtitle_ar: 'تابعنا وتواصل معنا',
    subtitle_en: 'Follow us & get in touch',
    background: '#0a1628',
    button_color: '#1E3A5F',
    button_radius: 'pill',
    logo_url: null,
    use_hero_background: true,
    overlay_strength: 'medium',
    motion_enabled: true,
    links: {
      facebook: linkItem({ enabled: true, url: OSTOL_FACEBOOK }),
      instagram: linkItem({ enabled: true, url: OSTOL_INSTAGRAM }),
      tiktok: linkItem({ enabled: true, url: OSTOL_TIKTOK }),
      phone: linkItem({ enabled: true, value: OSTOL_PHONE }),
      whatsapp: linkItem({ enabled: false, value: OSTOL_PHONE }),
      menu: linkItem({ enabled: true }),
    },
  };
}

type LinkPageOverrides = Partial<Omit<LinkPageSettings, 'links'>> & {
  links?: Partial<{
    [K in keyof LinkPageSettings['links']]: Partial<LinkPageLinkItem>;
  }>;
};

export function mergeLinkPageSettings(partial?: LinkPageOverrides | null): LinkPageSettings {
  const defaults = getDefaultLinkPageSettings();
  if (!partial) return defaults;

  return {
    ...defaults,
    ...partial,
    links: {
      ...defaults.links,
      ...partial.links,
      facebook: { ...defaults.links.facebook, ...partial.links?.facebook },
      instagram: { ...defaults.links.instagram, ...partial.links?.instagram },
      tiktok: { ...defaults.links.tiktok, ...partial.links?.tiktok },
      phone: { ...defaults.links.phone, ...partial.links?.phone },
      whatsapp: { ...defaults.links.whatsapp, ...partial.links?.whatsapp },
      menu: { ...defaults.links.menu, ...partial.links?.menu },
    },
  };
}
