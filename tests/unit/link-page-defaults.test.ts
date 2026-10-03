import { describe, expect, it } from 'vitest';
import { getDefaultLinkPageSettings, mergeLinkPageSettings } from '@/lib/link-page/defaults';

describe('link-page defaults', () => {
  it('returns Ostol seed links', () => {
    const defaults = getDefaultLinkPageSettings();
    expect(defaults.links.facebook.url).toBe('https://www.facebook.com/share/18yJx3VgWC/');
    expect(defaults.links.instagram.url).toBe('https://www.instagram.com/as.seafood/');
    expect(defaults.links.tiktok.url).toBe('https://www.tiktok.com/@as.seafood');
    expect(defaults.links.phone.value).toBe('01127244074');
    expect(defaults.use_hero_background).toBe(true);
    expect(defaults.overlay_strength).toBe('medium');
    expect(defaults.motion_enabled).toBe(true);
  });

  it('merges defaults when link_page row is missing', () => {
    const merged = mergeLinkPageSettings(null);
    expect(merged.title_ar).toBe('أسطول سي فود');
    expect(merged.links.facebook.enabled).toBe(true);
  });

  it('merges partial overrides without dropping other links', () => {
    const merged = mergeLinkPageSettings({
      title_en: 'Custom Title',
      links: { phone: { enabled: false } },
    });
    expect(merged.title_en).toBe('Custom Title');
    expect(merged.links.phone.enabled).toBe(false);
    expect(merged.links.instagram.url).toBe('https://www.instagram.com/as.seafood/');
  });
});
