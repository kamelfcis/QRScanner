import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchCategories = vi.fn();
const mockCreateClient = vi.fn();

vi.mock('@/lib/catalog/fetchCatalog', () => ({
  fetchCategoriesWithProducts: (...args: unknown[]) => mockFetchCategories(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

describe('GET /api/menu/snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCategories.mockResolvedValue([
      {
        id: 'cat-1',
        name_en: 'Fish',
        name_ar: 'سمك',
        products: [],
        subcategories: [],
      },
    ]);
    mockCreateClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { value: { currency: 'EGP', whatsapp: '+201234567890' } },
              error: null,
            }),
          }),
        }),
      }),
    });
  });

  it('returns categories, settings, and cachedAt with cache headers', async () => {
    const { GET } = await import('@/app/api/menu/snapshot/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.categories).toHaveLength(1);
    expect(body.categories[0].name_en).toBe('Fish');
    expect(body.settings).toMatchObject({ currency: 'EGP' });
    expect(typeof body.cachedAt).toBe('string');
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=300');
  });

  it('returns 500 when catalog fetch throws', async () => {
    mockFetchCategories.mockRejectedValueOnce(new Error('db down'));
    const { GET } = await import('@/app/api/menu/snapshot/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('db down');
  });
});
