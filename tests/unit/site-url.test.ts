import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildLinksPageUrl, getPublicSiteUrl, normalizeSiteUrl } from '@/lib/site-url';

describe('site-url', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('normalizes trailing slashes', () => {
    expect(normalizeSiteUrl('https://example.com/')).toBe('https://example.com');
    expect(normalizeSiteUrl('https://example.com///')).toBe('https://example.com');
  });

  it('prefers NEXT_PUBLIC_SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://ostol-seafood.engazqr.com');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://other.example.com');
    expect(getPublicSiteUrl()).toBe('https://ostol-seafood.engazqr.com');
  });

  it('falls back to NEXT_PUBLIC_APP_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://ostol-seafood.engazqr.com/');
    expect(getPublicSiteUrl()).toBe('https://ostol-seafood.engazqr.com');
  });

  it('uses explicit fallback origin when env is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect(getPublicSiteUrl('https://ostol-seafood.engazqr.com')).toBe(
      'https://ostol-seafood.engazqr.com'
    );
  });

  it('buildLinksPageUrl appends /links to the public site origin', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://ostol-seafood.engazqr.com');
    expect(buildLinksPageUrl()).toBe('https://ostol-seafood.engazqr.com/links');
  });
});
