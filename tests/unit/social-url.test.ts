import { describe, expect, it } from 'vitest';
import {
  normalizeFacebookUrl,
  normalizeInstagramUrl,
  normalizeTiktokUrl,
  resolveSocialUrl,
} from '@/lib/link-page/social-url';

describe('social-url', () => {
  it('normalizes Facebook share URL unchanged', () => {
    const url = 'https://www.facebook.com/share/18yJx3VgWC/';
    expect(normalizeFacebookUrl(url)).toBe(url);
    expect(resolveSocialUrl('facebook', url)).toBe(url);
  });

  it('normalizes Facebook handle to profile URL', () => {
    expect(normalizeFacebookUrl('my.page')).toBe('https://facebook.com/my.page');
  });

  it('normalizes Instagram profile URL', () => {
    const url = 'https://www.instagram.com/as.seafood/';
    expect(normalizeInstagramUrl(url)).toBe(url);
  });

  it('normalizes Instagram @handle', () => {
    expect(normalizeInstagramUrl('@as.seafood')).toBe('https://www.instagram.com/as.seafood/');
  });

  it('normalizes TikTok profile URL', () => {
    const url = 'https://www.tiktok.com/@as.seafood';
    expect(normalizeTiktokUrl(url)).toBe(url);
  });

  it('normalizes TikTok @handle', () => {
    expect(normalizeTiktokUrl('@as.seafood')).toBe('https://www.tiktok.com/@as.seafood');
  });
});
