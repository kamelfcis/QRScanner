import { describe, it, expect } from 'vitest';
import {
  buildDeliveryAddressSnapshot,
  getDeliveryLocationLabel,
} from '@/lib/order/delivery-location';

const location = {
  name_ar: 'المعادي',
  name_en: 'Maadi',
  name_fr: 'Maadi',
  name_nl: 'Maadi',
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
});
