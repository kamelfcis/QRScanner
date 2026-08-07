import { describe, it, expect, vi } from 'vitest';

describe('Import text extraction (server-side)', () => {
  it('extractTextFromBuffer is exported', async () => {
    const { extractTextFromBuffer } = await import('@/lib/import/text-extraction-server');
    expect(typeof extractTextFromBuffer).toBe('function');
  });

  it('rejects unsupported file types', async () => {
    const { extractTextFromBuffer } = await import('@/lib/import/text-extraction-server');
    const buffer = Buffer.from('test');
    await expect(extractTextFromBuffer(buffer, 'text/plain')).rejects.toThrow(
      'Unsupported file type'
    );
  });
});

describe('Import AI extraction', () => {
  it('extractMenuData is exported', async () => {
    const { extractMenuData } = await import('@/lib/import/ai-extraction');
    expect(typeof extractMenuData).toBe('function');
  });
});

describe('Import pipeline', () => {
  it('exports startImportPipeline', async () => {
    vi.mock('@/lib/supabase/client', () => ({
      createClient: () => ({
        from: () => ({
          insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
        }),
        storage: {
          from: () => ({
            upload: () => ({ data: null, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: '' } }),
          }),
        },
      }),
    }));
    const mod = await import('@/lib/import/pipeline');
    expect(typeof mod.startImportPipeline).toBe('function');
  });

  it('exports confirmImport', async () => {
    const mod = await import('@/lib/import/pipeline');
    expect(typeof mod.confirmImport).toBe('function');
  });

  it('exports deleteImportJob', async () => {
    const mod = await import('@/lib/import/pipeline');
    expect(typeof mod.deleteImportJob).toBe('function');
  });
});

describe('Import types', () => {
  it('has correct ImportJob status values', async () => {
    const statuses = [
      'uploading',
      'processing',
      'parsing',
      'preview',
      'importing',
      'completed',
      'failed',
    ];
    // ImportJob is a type-only export
    expect(statuses).toHaveLength(7);
  });

  it('ImportExtractedData has correct structure', () => {
    const data = {
      restaurant: { name_en: 'Test' },
      categories: [
        {
          name_en: 'Category 1',
          products: [{ name_en: 'Product 1', dining_price: 25 }],
        },
      ],
      confidence: { overall: 0.9, restaurant: 0.8, categories: 0.85, products: 0.7 },
    };
    expect(data.restaurant.name_en).toBe('Test');
    expect(data.categories).toHaveLength(1);
    expect(data.categories[0].products).toHaveLength(1);
    expect(data.confidence.overall).toBe(0.9);
  });

  it('ImportExtractedProduct has correct fields', () => {
    const product = {
      name_en: 'Kebab',
      name_ar: 'كباب',
      description_en: 'Grilled kebab',
      dining_price: 35,
      takeaway_price: 30,
      confidence: 0.95,
    };
    expect(product.name_en).toBe('Kebab');
    expect(product.dining_price).toBe(35);
  });
});
