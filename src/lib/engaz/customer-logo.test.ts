import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_LOGO_PLACEHOLDER_PATH,
  buildLogoCandidates,
  customerLogoFallbackLetter,
  getCustomerLogoPlaceholderPath,
  getRegistrationLogoPublicUrl,
} from '@/lib/engaz/customer-logo';

describe('buildLogoCandidates', () => {
  it('prefers live logo, then registration, then placeholder', () => {
    expect(
      buildLogoCandidates({
        liveLogoUrl: 'https://cdn.example/live.png',
        registrationLogoUrl: 'https://cdn.example/reg.png',
      })
    ).toEqual([
      'https://cdn.example/live.png',
      'https://cdn.example/reg.png',
      CUSTOMER_LOGO_PLACEHOLDER_PATH,
    ]);
  });

  it('skips empty urls and still includes placeholder', () => {
    expect(buildLogoCandidates({ liveLogoUrl: '', registrationLogoUrl: null })).toEqual([
      CUSTOMER_LOGO_PLACEHOLDER_PATH,
    ]);
  });

  it('uses registration logo when live logo is missing', () => {
    expect(
      buildLogoCandidates({
        registrationLogoUrl: 'https://cdn.example/reg.png',
      })
    ).toEqual(['https://cdn.example/reg.png', CUSTOMER_LOGO_PLACEHOLDER_PATH]);
  });
});

describe('getCustomerLogoPlaceholderPath', () => {
  it('returns the generic Engaz placeholder asset', () => {
    expect(getCustomerLogoPlaceholderPath()).toBe('/brand/customer-logo-placeholder.svg');
  });
});

describe('customerLogoFallbackLetter', () => {
  it('returns uppercase first letter', () => {
    expect(customerLogoFallbackLetter('ala keefak')).toBe('A');
  });

  it('returns ? for empty names', () => {
    expect(customerLogoFallbackLetter('   ')).toBe('?');
  });
});

describe('getRegistrationLogoPublicUrl', () => {
  it('returns null when logo path or base url is missing', () => {
    expect(getRegistrationLogoPublicUrl(null)).toBeNull();
    expect(getRegistrationLogoPublicUrl('logo.png')).toBeNull();
  });
});
