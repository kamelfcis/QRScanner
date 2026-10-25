import type { LinkPageLinkItem, LinkPageSettings } from '@/types';

const EMPTY = '';

function linkItem(overrides: Partial<LinkPageLinkItem> & { enabled: boolean }): LinkPageLinkItem {
  return { enabled: overrides.enabled, url: overrides.url, value: overrides.value };
}

export function getDefaultLinkPageSettings(): LinkPageSettings {
  return {
    enabled: true,
    title_ar: 'مخبوز',
    title_en: 'Makhboz',
    subtitle_ar: 'تصفّح القائمة',
    subtitle_en: 'Browse the menu',
    background: '#0a1628',
    button_color: '#1E3A5F',
    button_radius: 'pill',
    logo_url: null,
    use_hero_background: true,
    overlay_strength: 'medium',
    motion_enabled: true,
    links: {
      facebook: linkItem({ enabled: false, url: EMPTY }),
      instagram: linkItem({ enabled: false, url: EMPTY }),
      tiktok: linkItem({ enabled: false, url: EMPTY }),
      phone: linkItem({ enabled: false, value: EMPTY }),
      whatsapp: linkItem({ enabled: false, value: EMPTY }),
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
