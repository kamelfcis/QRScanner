import { describe, it, expect } from 'vitest';
import {
  isContactPlaceholder,
  resolveContactField,
  getMapEmbedUrl,
  resolveContactAddress,
} from '@/lib/contact/defaults';

describe('isContactPlaceholder', () => {
  it('returns true for empty or whitespace values', () => {
    expect(isContactPlaceholder(null)).toBe(true);
    expect(isContactPlaceholder(undefined)).toBe(true);
    expect(isContactPlaceholder('')).toBe(true);
    expect(isContactPlaceholder('   ')).toBe(true);
  });

  it('returns true for YOUR_* template values', () => {
    expect(isContactPlaceholder('YOUR_PHONE_EG')).toBe(true);
    expect(isContactPlaceholder('  YOUR_WHATSAPP_EG  ')).toBe(true);
  });

  it('returns false for real contact values', () => {
    expect(isContactPlaceholder('201001234567')).toBe(false);
    expect(isContactPlaceholder('hello@example.com')).toBe(false);
  });
});

describe('resolveContactField', () => {
  it('returns trimmed value for real data', () => {
    expect(resolveContactField('  201001234567  ')).toBe('201001234567');
  });

  it('returns null for placeholders', () => {
    expect(resolveContactField('YOUR_EMAIL')).toBeNull();
    expect(resolveContactField('')).toBeNull();
  });
});

describe('getMapEmbedUrl', () => {
  it('returns null for placeholder URLs', () => {
    expect(getMapEmbedUrl('YOUR_GOOGLE_MAPS_URL')).toBeNull();
    expect(getMapEmbedUrl(null)).toBeNull();
  });

  it('returns embed URLs unchanged', () => {
    const embed = 'https://www.google.com/maps/embed?pb=abc123';
    expect(getMapEmbedUrl(embed)).toBe(embed);
  });

  it('appends output=embed for google.com/maps URLs', () => {
    expect(getMapEmbedUrl('https://www.google.com/maps/place/Cairo')).toBe(
      'https://www.google.com/maps/place/Cairo?output=embed'
    );
  });

  it('appends output=embed with & when query params exist', () => {
    expect(getMapEmbedUrl('https://www.google.com/maps?q=Cairo&hl=en')).toBe(
      'https://www.google.com/maps?q=Cairo&hl=en&output=embed'
    );
  });

  it('handles goo.gl/maps and maps.app.goo.gl short links', () => {
    expect(getMapEmbedUrl('https://goo.gl/maps/abc123')).toBe(
      'https://goo.gl/maps/abc123?output=embed'
    );
    expect(getMapEmbedUrl('https://maps.app.goo.gl/abc123')).toBe(
      'https://maps.app.goo.gl/abc123?output=embed'
    );
  });

  it('returns null for non-Google map URLs', () => {
    expect(getMapEmbedUrl('https://example.com/location')).toBeNull();
  });
});

describe('resolveContactAddress', () => {
  it('falls back to Egypt when address fields are placeholders', () => {
    expect(
      resolveContactAddress({ address_ar: 'YOUR_ADDRESS_AR', address_en: 'YOUR_ADDRESS_EN' }, 'en')
    ).toBe('Egypt');
    expect(
      resolveContactAddress({ address_ar: 'YOUR_ADDRESS_AR', address_en: 'YOUR_ADDRESS_EN' }, 'ar')
    ).toBe('مصر');
  });

  it('uses real address when available', () => {
    expect(
      resolveContactAddress(
        { address_en: 'Alexandria, Egypt', address_ar: 'YOUR_ADDRESS_AR' },
        'en'
      )
    ).toBe('Alexandria, Egypt');
  });
});
