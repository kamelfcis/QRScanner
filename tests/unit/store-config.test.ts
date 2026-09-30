import { afterEach, describe, expect, it, vi } from 'vitest';

describe('store-config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('defaults to restaurant mode with welcome entry', async () => {
    vi.stubEnv('NEXT_PUBLIC_STORE_MODE', '');
    vi.stubEnv('NEXT_PUBLIC_QR_TARGET_PATH', '');
    const config = await import('@/lib/store-config');
    expect(config.storeMode).toBe('restaurant');
    expect(config.isEcommerceStore).toBe(false);
    expect(config.showDiningModeToggle).toBe(true);
    expect(config.qrTargetPath).toBe('/welcome');
    expect(config.skipWelcomePage).toBe(false);
  });

  it('ecommerce mode skips welcome and hides dining toggle', async () => {
    vi.stubEnv('NEXT_PUBLIC_STORE_MODE', 'ecommerce');
    vi.stubEnv('NEXT_PUBLIC_QR_TARGET_PATH', '');
    const config = await import('@/lib/store-config');
    expect(config.isEcommerceStore).toBe(true);
    expect(config.showDiningModeToggle).toBe(false);
    expect(config.qrTargetPath).toBe('/menu');
    expect(config.skipWelcomePage).toBe(true);
    expect(config.defaultDiningMode).toBe('takeaway');
    expect(config.buildMenuEntryUrl()).toBe('/menu');
    expect(config.buildMenuEntryUrl('5')).toBe('/menu?table=5');
  });

  it('QR target path alone can skip welcome for restaurants', async () => {
    vi.stubEnv('NEXT_PUBLIC_STORE_MODE', 'restaurant');
    vi.stubEnv('NEXT_PUBLIC_QR_TARGET_PATH', '/menu');
    const config = await import('@/lib/store-config');
    expect(config.skipWelcomePage).toBe(true);
    expect(config.getMenuEntryPath()).toBe('/menu');
    expect(config.buildMenuEntryUrl(null, 'dining')).toBe('/menu?mode=dine_in');
  });
});
