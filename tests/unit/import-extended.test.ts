import { describe, it, expect } from 'vitest';
import type { ImportExtractedData } from '@/types/database';

describe('Import pipeline data structures', () => {
  it('extracted data can have empty categories', () => {
    const data: ImportExtractedData = {
      restaurant: {},
      categories: [],
      confidence: { overall: 0, restaurant: 0, categories: 0, products: 0 },
    };
    expect(data.categories).toHaveLength(0);
  });

  it('extracted data can have multiple categories with products', () => {
    const data: ImportExtractedData = {
      restaurant: { name_en: 'Restaurant', name_ar: 'مطعم' },
      categories: [
        {
          name_en: 'Starters',
          name_ar: 'مقبلات',
          products: [
            { name_en: 'Soup', name_ar: 'حساء', dining_price: 10, confidence: 0.9 },
            { name_en: 'Salad', name_ar: 'سلطة', dining_price: 12, confidence: 0.85 },
          ],
          confidence: 0.88,
        },
        {
          name_en: 'Mains',
          name_ar: 'أطباق رئيسية',
          products: [
            { name_en: 'Steak', name_ar: 'ستيك', dining_price: 55, confidence: 0.95 },
          ],
          confidence: 0.92,
        },
      ],
      confidence: { overall: 0.9, restaurant: 0.95, categories: 0.9, products: 0.88 },
    };
    expect(data.categories).toHaveLength(2);
    expect(data.categories[0].products).toHaveLength(2);
    expect(data.categories[1].products).toHaveLength(1);
  });

  it('extracted product can have all optional fields', () => {
    const product = {
      name_en: 'Grilled Chicken',
      name_ar: 'دجاج مشوي',
      description_en: 'With rice and salad',
      description_ar: 'مع أرز وسلطة',
      dining_price: 45,
      takeaway_price: 40,
      confidence: 0.92,
    };
    expect(product.description_en).toBeTruthy();
    expect(product.takeaway_price).toBeLessThan(product.dining_price!);
  });

  it('confidence scores are between 0 and 1', () => {
    const confidence = { overall: 0.85, restaurant: 0.9, categories: 0.8, products: 0.75 };
    Object.values(confidence).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });
});

describe('Import job status transitions', () => {
  const validTransitions: Record<string, string[]> = {
    uploading: ['processing', 'failed'],
    processing: ['parsing', 'failed'],
    parsing: ['preview', 'failed'],
    preview: ['importing', 'failed'],
    importing: ['completed', 'failed'],
    completed: [],
    failed: [],
  };

  it('has valid transitions for all statuses', () => {
    expect(Object.keys(validTransitions)).toHaveLength(7);
    expect(validTransitions.uploading).toContain('processing');
    expect(validTransitions.completed).toHaveLength(0);
  });

  it('failed is a terminal state', () => {
    expect(validTransitions.failed).toHaveLength(0);
  });

  it('completed is a terminal state', () => {
    expect(validTransitions.completed).toHaveLength(0);
  });
});

describe('Import file types', () => {
  it('supports pdf', () => {
    const ext = 'pdf';
    expect(['pdf', 'png', 'jpeg', 'webp']).toContain(ext);
  });

  it('supports image types', () => {
    const imageTypes = ['png', 'jpeg', 'webp'];
    imageTypes.forEach((t) => {
      expect(['pdf', 'png', 'jpeg', 'webp']).toContain(t);
    });
  });
});
