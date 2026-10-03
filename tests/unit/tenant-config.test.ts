import { afterEach, describe, expect, it, vi } from 'vitest';

describe('tenant-config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('showLinkPage is true for ostol tenant', async () => {
    vi.stubEnv('NEXT_PUBLIC_TENANT', 'ostol');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_LINK_PAGE', '');
    const config = await import('@/lib/tenant-config');
    expect(config.isOstolTenant).toBe(true);
    expect(config.showLinkPage).toBe(true);
  });

  it('showLinkPage is false for non-ostol tenant', async () => {
    vi.stubEnv('NEXT_PUBLIC_TENANT', '');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_LINK_PAGE', '');
    const config = await import('@/lib/tenant-config');
    expect(config.showLinkPage).toBe(false);
  });

  it('hides linkPage nav for non-ostol', async () => {
    vi.stubEnv('NEXT_PUBLIC_TENANT', '');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_LINK_PAGE', '');
    vi.stubEnv('NEXT_PUBLIC_STORE_MODE', 'restaurant');
    const nav = await import('@/lib/navigation/dashboardNav');
    const keys = nav.getDashboardNav().map((item) => item.key);
    expect(keys).not.toContain('linkPage');
  });

  it('shows linkPage nav for ostol tenant', async () => {
    vi.stubEnv('NEXT_PUBLIC_TENANT', 'ostol');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_LINK_PAGE', '');
    vi.stubEnv('NEXT_PUBLIC_STORE_MODE', 'restaurant');
    const nav = await import('@/lib/navigation/dashboardNav');
    const keys = nav.getDashboardNav().map((item) => item.key);
    expect(keys).toContain('linkPage');
  });
});
