import { describe, it, expect } from 'vitest';
import { generateOrderPaymentRef, hasInstapayProof } from '@/lib/payment/instapay-proof';

describe('hasInstapayProof', () => {
  it('returns false when both fields are empty', () => {
    expect(hasInstapayProof('', null)).toBe(false);
    expect(hasInstapayProof('  ', '  ')).toBe(false);
  });

  it('returns true with reference only', () => {
    expect(hasInstapayProof('REF123', null)).toBe(true);
  });

  it('returns true with screenshot URL only', () => {
    expect(hasInstapayProof('', 'https://example.com/proof.png')).toBe(true);
  });
});

describe('generateOrderPaymentRef', () => {
  it('generates MS-{timestamp}-{4chars} format', () => {
    const ref = generateOrderPaymentRef();
    expect(ref).toMatch(/^MS-\d+-[A-Z0-9]{4}$/);
  });
});
