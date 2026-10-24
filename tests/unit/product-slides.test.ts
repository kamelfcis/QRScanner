import { describe, expect, it } from 'vitest';
import {
  buildProductSlides,
  MAX_PRODUCT_SLIDES,
  readProductGallery,
} from '@/lib/catalog/product-slides';

describe('buildProductSlides', () => {
  it('puts the cover first, then gallery by sort_order and created_at', () => {
    const slides = buildProductSlides('https://cdn.example/cover.jpg', [
      {
        image_url: 'https://cdn.example/b.jpg',
        sort_order: 1,
        created_at: '2026-01-02T00:00:00Z',
      },
      {
        image_url: 'https://cdn.example/a.jpg',
        sort_order: 0,
        created_at: '2026-01-03T00:00:00Z',
      },
      {
        image_url: 'https://cdn.example/c.jpg',
        sort_order: 1,
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);

    expect(slides).toEqual([
      'https://cdn.example/cover.jpg',
      'https://cdn.example/a.jpg',
      'https://cdn.example/c.jpg',
      'https://cdn.example/b.jpg',
    ]);
  });

  it('drops gallery urls equal to the cover and caps at 6', () => {
    const gallery = Array.from({ length: 8 }, (_, index) => ({
      image_url: index === 0 ? 'https://cdn.example/cover.jpg' : `https://cdn.example/${index}.jpg`,
      sort_order: index,
      created_at: `2026-01-0${index + 1}T00:00:00Z`,
    }));

    const slides = buildProductSlides('https://cdn.example/cover.jpg', gallery);

    expect(slides).toHaveLength(MAX_PRODUCT_SLIDES);
    expect(slides[0]).toBe('https://cdn.example/cover.jpg');
    expect(slides.filter((url) => url === 'https://cdn.example/cover.jpg')).toHaveLength(1);
    expect(slides).not.toContain('https://cdn.example/7.jpg');
  });

  it('does not invent a cover from the first gallery image', () => {
    expect(
      buildProductSlides(null, [{ image_url: 'https://cdn.example/only.jpg', sort_order: 0 }])
    ).toEqual(['https://cdn.example/only.jpg']);
  });
});

describe('readProductGallery', () => {
  it('returns an empty list when gallery is missing', () => {
    expect(readProductGallery({ id: 'p1' })).toEqual([]);
    expect(readProductGallery(null)).toEqual([]);
  });

  it('keeps rows that have an image url', () => {
    expect(
      readProductGallery({
        gallery: [
          { id: 'g1', image_url: ' https://cdn.example/a.jpg ', sort_order: 2 },
          { image_url: '  ' },
          null,
        ],
      })
    ).toEqual([
      {
        id: 'g1',
        product_id: undefined,
        image_url: 'https://cdn.example/a.jpg',
        sort_order: 2,
        created_at: null,
      },
    ]);
  });
});
