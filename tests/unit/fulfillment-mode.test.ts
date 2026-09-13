import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFulfillmentMode, isDeliveryOnlyMode, isHarameenFulfillmentTenant } from '@/lib/fulfillment-mode';

describe('fulfillment-mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('honors explicit delivery_only even on restaurant tenants', () => {
    vi.stubEnv('NEXT_PUBLIC_FULFILLMENT_MODE', 'delivery_only');
    vi.stubEnv('NEXT_PUBLIC_TENANT', 'warda');
    expect(getFulfillmentMode()).toBe('delivery_only');
    expect(isDeliveryOnlyMode()).toBe(true);
  });

  it('honors explicit default so restaurant branches can keep dine-in + takeaway', () => {
    vi.stubEnv('NEXT_PUBLIC_FULFILLMENT_MODE', 'default');
    vi.stubEnv('NEXT_PUBLIC_TENANT', 'harameen');
    expect(getFulfillmentMode()).toBe('default');
    expect(isDeliveryOnlyMode()).toBe(false);
  });

  it('locks Harameen tenant to delivery-only when the env flag is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_FULFILLMENT_MODE', '');
    vi.stubEnv('NEXT_PUBLIC_TENANT', 'harameen');
    expect(isHarameenFulfillmentTenant()).toBe(true);
    expect(isDeliveryOnlyMode()).toBe(true);
  });

  it('infers Harameen from public site URL (production host)', () => {
    vi.stubEnv('NEXT_PUBLIC_FULFILLMENT_MODE', '');
    vi.stubEnv('NEXT_PUBLIC_TENANT', '');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://harameen.engazqr.com');
    expect(isDeliveryOnlyMode()).toBe(true);
  });

  it('keeps restaurant tenants on default modes when the flag is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_FULFILLMENT_MODE', '');
    vi.stubEnv('NEXT_PUBLIC_TENANT', 'aklet');
    expect(isHarameenFulfillmentTenant()).toBe(false);
    expect(isDeliveryOnlyMode()).toBe(false);
  });

  it('defaults this wholesale branch to delivery-only when identity is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_FULFILLMENT_MODE', '');
    vi.stubEnv('NEXT_PUBLIC_TENANT', '');
    vi.stubEnv('NEXT_PUBLIC_APP_NAME', '');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect(isDeliveryOnlyMode()).toBe(true);
  });
});
