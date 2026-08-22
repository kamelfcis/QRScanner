import { describe, it, expect } from 'vitest';
import {
  formatDisplayPhone,
  normalizeLocalPhone,
  toWhatsAppDigits,
  buildTelUri,
} from '@/lib/phone/normalize';
import { getCountryPrefix } from '@/lib/phone/country-dial';

describe('normalizeLocalPhone', () => {
  it('converts Egyptian local mobile to international digits', () => {
    expect(normalizeLocalPhone('01501534655', 'EG')).toBe('201501534655');
  });

  it('strips leading zero before prepending dial code', () => {
    expect(normalizeLocalPhone('01001234567', 'EG')).toBe('201001234567');
  });

  it('leaves already-international Egyptian digits unchanged', () => {
    expect(normalizeLocalPhone('201501534655', 'EG')).toBe('201501534655');
  });

  it('converts Saudi local numbers', () => {
    expect(normalizeLocalPhone('0500000001', 'SA')).toBe('966500000001');
  });
});

describe('toWhatsAppDigits', () => {
  it('detects numbers that already include country code', () => {
    expect(toWhatsAppDigits('+966 50-000-0001')).toBe('966500000001');
    expect(toWhatsAppDigits('201501534655')).toBe('201501534655');
  });

  it('normalizes Egyptian local restaurant numbers', () => {
    expect(toWhatsAppDigits('01001234567', 'EG')).toBe('201001234567');
  });

  it('normalizes prefixed plus numbers', () => {
    expect(toWhatsAppDigits('+20 150 153 4655')).toBe('201501534655');
  });
});

describe('formatDisplayPhone', () => {
  it('formats Egyptian digits for display', () => {
    expect(formatDisplayPhone('201501534655')).toBe('+20 150 153 4655');
  });

  it('returns empty string for blank input', () => {
    expect(formatDisplayPhone('')).toBe('');
  });
});

describe('buildTelUri', () => {
  it('builds tel link with normalized international digits', () => {
    expect(buildTelUri('01001234567', 'EG')).toBe('tel:+201001234567');
    expect(buildTelUri('+20 150 153 4655')).toBe('tel:+201501534655');
  });

  it('returns empty string for blank input', () => {
    expect(buildTelUri('')).toBe('');
  });
});

describe('getCountryPrefix', () => {
  it('returns +20 for Egypt', () => {
    expect(getCountryPrefix('EG')).toBe('+20');
  });
});
