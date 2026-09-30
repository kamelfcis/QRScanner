import { afterEach, describe, expect, it, vi } from 'vitest';

describe('buildWelcomeUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('points restaurant QR codes to welcome', async () => {
    vi.stubEnv('NEXT_PUBLIC_STORE_MODE', 'restaurant');
    vi.stubEnv('NEXT_PUBLIC_QR_TARGET_PATH', '/welcome');
    const { buildWelcomeUrl } = await import('@/lib/qr/welcome-url');
    expect(buildWelcomeUrl('https://example.com')).toBe('https://example.com/welcome');
    expect(buildWelcomeUrl('https://example.com/', 12)).toBe(
      'https://example.com/welcome?table=12'
    );
  });

  it('points ecommerce QR codes to menu', async () => {
    vi.stubEnv('NEXT_PUBLIC_STORE_MODE', 'ecommerce');
    vi.stubEnv('NEXT_PUBLIC_QR_TARGET_PATH', '/menu');
    const { buildWelcomeUrl } = await import('@/lib/qr/welcome-url');
    expect(buildWelcomeUrl('https://example.com')).toBe('https://example.com/menu');
    expect(buildWelcomeUrl('https://example.com/', 12)).toBe('https://example.com/menu?table=12');
  });
});
