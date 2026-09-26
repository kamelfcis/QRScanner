import { beforeAll, describe, expect, it } from 'vitest';

type ProductSizesModule = typeof import('@/lib/catalog/product-sizes');

let mod: ProductSizesModule;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_TENANT = 'ala-keefak';
  mod = await import('@/lib/catalog/product-sizes');
});

const baseProduct = {
  dining_price: 50,
  takeaway_price: 80,
  price_medium: 65,
  price_family: 120,
  has_size_options: true,
  size_small_enabled: true,
  size_medium_enabled: false,
  size_large_enabled: true,
  size_family_enabled: false,
};

describe('product-sizes (ala-keefak)', () => {
  it('returns enabled sizes in display order', () => {
    expect(mod.getEnabledProductSizes(baseProduct)).toEqual(['small', 'large']);
  });

  it('includes medium and family when enabled', () => {
    expect(
      mod.getEnabledProductSizes({
        ...baseProduct,
        size_medium_enabled: true,
        size_family_enabled: true,
      })
    ).toEqual(['small', 'medium', 'large', 'family']);
  });

  it('resolves price per size id', () => {
    expect(mod.getProductSizePrice(baseProduct, 'small')).toBe(50);
    expect(mod.getProductSizePrice(baseProduct, 'medium')).toBe(65);
    expect(mod.getProductSizePrice(baseProduct, 'large')).toBe(80);
    expect(mod.getProductSizePrice(baseProduct, 'family')).toBe(120);
  });

  it('computes min/max range from enabled sizes only', () => {
    expect(mod.getProductSizePriceRange(baseProduct)).toEqual({ min: 50, max: 80 });
    expect(
      mod.getProductSizePriceRange({
        ...baseProduct,
        size_small_enabled: false,
        size_family_enabled: true,
      })
    ).toEqual({ min: 80, max: 120 });
  });

  it('validates selection against enabled flags', () => {
    expect(mod.isValidProductSizeSelection(baseProduct, 'small')).toBe(true);
    expect(mod.isValidProductSizeSelection(baseProduct, 'medium')).toBe(false);
    expect(mod.isValidProductSizeSelection(baseProduct, 'family')).toBe(false);
    expect(mod.isValidProductSizeSelection({ ...baseProduct, has_size_options: false }, null)).toBe(
      true
    );
  });

  it('defaults to first enabled size', () => {
    expect(mod.getDefaultProductSize(baseProduct)).toBe('small');
    expect(
      mod.getDefaultProductSize({
        ...baseProduct,
        size_small_enabled: false,
        size_medium_enabled: true,
      })
    ).toBe('medium');
  });
});
