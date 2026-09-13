import { describe, it, expect } from 'vitest';
import {
  buildDeliveryAddressSnapshot,
  formatDeliveryLocationOption,
  getDeliveryLocationLabel,
} from '@/lib/order/delivery-location';

const location = {
  name_ar: 'المعادي',
  name_en: 'Maadi',
  name_fr: 'Maadi',
  name_nl: 'Maadi',
  delivery_fee: 25,
};

describe('delivery location helpers', () => {
  it('returns localized location label', () => {
    expect(getDeliveryLocationLabel('ar', location)).toBe('المعادي');
    expect(getDeliveryLocationLabel('en', location)).toBe('Maadi');
  });

  it('builds address snapshot with optional details', () => {
    expect(buildDeliveryAddressSnapshot('en', location)).toBe('Maadi');
    expect(buildDeliveryAddressSnapshot('en', location, 'Building 5, floor 2')).toBe(
      'Maadi\nBuilding 5, floor 2'
    );
  });

  it('formats dropdown option with localized name and fee', () => {
    expect(formatDeliveryLocationOption('ar', location, 'EGP', 'ar')).toMatch(/^المعادي — .+$/);
    expect(formatDeliveryLocationOption('en', location, 'EGP', 'en')).toMatch(/^Maadi — .+$/);
  });
});
