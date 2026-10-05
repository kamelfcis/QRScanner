import { describe, it, expect } from 'vitest';
import {
  generateOrderPaymentRef,
  hasInstapayProof,
  isValidInstapayReference,
  normalizeInstapayReference,
  INSTAPAY_REF_MIN,
  INSTAPAY_REF_MAX,
  INSTAPAY_REF_PATTERN,
} from '@/lib/payment/instapay-proof';

describe('normalizeInstapayReference', () => {
  it('trims and uppercases', () => {
    expect(normalizeInstapayReference('  abc123  ')).toBe('ABC123');
    expect(normalizeInstapayReference('ref456')).toBe('REF456');
  });
});

describe('isValidInstapayReference', () => {
  it('accepts valid alphanumeric refs', () => {
    expect(isValidInstapayReference('A1B2C3D4')).toBe(true);
    expect(isValidInstapayReference('1234567890')).toBe(true);
    expect(isValidInstapayReference('  abc123  ')).toBe(true);
  });

  it('rejects invalid refs', () => {
    expect(isValidInstapayReference('')).toBe(false);
    expect(isValidInstapayReference('.')).toBe(false);
    expect(isValidInstapayReference('-')).toBe(false);
    expect(isValidInstapayReference('A')).toBe(false);
    expect(isValidInstapayReference('abc!')).toBe(false);
    expect(isValidInstapayReference('A'.repeat(INSTAPAY_REF_MAX + 1))).toBe(false);
  });

  it('exports pattern constants', () => {
    expect(INSTAPAY_REF_MIN).toBe(6);
    expect(INSTAPAY_REF_MAX).toBe(20);
    expect(INSTAPAY_REF_PATTERN.test('ABCDEF')).toBe(true);
  });
});

describe('hasInstapayProof', () => {
  it('returns false when reference is empty or invalid', () => {
    expect(hasInstapayProof('', null)).toBe(false);
    expect(hasInstapayProof('  ', '  ')).toBe(false);
    expect(hasInstapayProof('.', null)).toBe(false);
    expect(hasInstapayProof('abc', null)).toBe(false);
  });

  it('returns true with valid reference only', () => {
    expect(hasInstapayProof('REF123', null)).toBe(true);
    expect(hasInstapayProof('A1B2C3D4', null)).toBe(true);
  });

  it('returns false with screenshot URL only', () => {
    expect(hasInstapayProof('', 'https://example.com/proof.png')).toBe(false);
    expect(hasInstapayProof(null, 'https://example.com/proof.png')).toBe(false);
  });
});

describe('generateOrderPaymentRef', () => {
  it('generates MS-{timestamp}-{4chars} format', () => {
    const ref = generateOrderPaymentRef();
    expect(ref).toMatch(/^MS-\d+-[A-Z0-9]{4}$/);
  });
});
