import { describe, expect, it } from 'vitest';
import { getDefaultLinkPageSettings, mergeLinkPageSettings } from '@/lib/link-page/defaults';

describe('link-page defaults', () => {
  it('returns empty contact links for a new bakery', () => {
    const defaults = getDefaultLinkPageSettings();
    expect(defaults.title_ar).toBe('مخبوز');
    expect(defaults.links.facebook.url).toBe('');
    expect(defaults.links.instagram.url).toBe('');
    expect(defaults.links.tiktok.url).toBe('');
    expect(defaults.links.phone.value).toBe('');
    expect(defaults.links.facebook.enabled).toBe(false);
    expect(defaults.use_hero_background).toBe(true);
    expect(defaults.overlay_strength).toBe('medium');
    expect(defaults.motion_enabled).toBe(true);
  });

  it('merges defaults when link_page row is missing', () => {
    const merged = mergeLinkPageSettings(null);
    expect(merged.title_ar).toBe('مخبوز');
    expect(merged.links.facebook.enabled).toBe(false);
  });

  it('merges partial overrides without dropping other links', () => {
    const merged = mergeLinkPageSettings({
      title_en: 'Custom Title',
      links: { phone: { enabled: false } },
    });
    expect(merged.title_en).toBe('Custom Title');
    expect(merged.links.phone.enabled).toBe(false);
    expect(merged.links.instagram.url).toBe('');
  });
});
