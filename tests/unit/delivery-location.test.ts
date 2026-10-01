import { describe, expect, it } from 'vitest';
import {
  buildDeliveryAddressSnapshot,
  formatDeliveryLocationOption,
  getDeliveryLocationLabel,
} from '@/lib/order/delivery-location';

const location = {
  name_en: 'Maadi',
  name_ar: 'المعادي',
  name_fr: null,
  name_nl: null,
  delivery_fee: 45,
};

describe('delivery-location helpers', () => {
  it('returns localized label', () => {
    expect(getDeliveryLocationLabel('en', location)).toBe('Maadi');
    expect(getDeliveryLocationLabel('ar', location)).toBe('المعادي');
  });

  it('formats option with fee', () => {
    expect(formatDeliveryLocationOption('en', location, 'EGP')).toContain('Maadi');
    expect(formatDeliveryLocationOption('en', location, 'EGP')).toContain('45');
  });

  it('builds address snapshot with optional details', () => {
    expect(buildDeliveryAddressSnapshot('en', location)).toBe('Maadi');
    expect(buildDeliveryAddressSnapshot('en', location, 'Building 5, Apt 2')).toBe(
      'Maadi\nBuilding 5, Apt 2'
    );
  });
});
