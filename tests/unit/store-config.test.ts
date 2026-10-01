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

  it('ecommerce mode hides restaurant-only dashboard nav and paths', async () => {
    vi.stubEnv('NEXT_PUBLIC_STORE_MODE', 'ecommerce');
    vi.stubEnv('NEXT_PUBLIC_QR_TARGET_PATH', '');
    const config = await import('@/lib/store-config');
    const nav = await import('@/lib/navigation/dashboardNav');

    expect(config.isRestaurantOnlyDashboardPath('/dashboard/tables')).toBe(true);
    expect(config.isRestaurantOnlyDashboardPath('/dashboard/reports')).toBe(true);
    expect(config.isRestaurantOnlyDashboardPath('/dashboard/analytics/heatmaps')).toBe(true);
    expect(config.isRestaurantOnlyDashboardPath('/dashboard/menu')).toBe(false);

    const keys = nav.getDashboardNav().map((item) => item.key);
    expect(keys).not.toContain('tables');
    expect(keys).not.toContain('reports');
    expect(keys).toContain('deliveryLocations');
    expect(keys).toContain('menu');
    expect(keys).toContain('settings');
  });

  it('restaurant mode hides ecommerce-only dashboard nav', async () => {
    vi.stubEnv('NEXT_PUBLIC_STORE_MODE', 'restaurant');
    vi.stubEnv('NEXT_PUBLIC_QR_TARGET_PATH', '');
    const nav = await import('@/lib/navigation/dashboardNav');
    const keys = nav.getDashboardNav().map((item) => item.key);
    expect(keys).not.toContain('deliveryLocations');
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
