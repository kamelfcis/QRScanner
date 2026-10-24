export const MAX_PRODUCT_SLIDES = 6;

export interface ProductGallerySlideInput {
  id?: string;
  product_id?: string;
  image_url: string | null;
  sort_order?: number | null;
  created_at?: string | null;
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Cover first, then gallery by sort_order and created_at. Drops the cover URL and caps at 6. */
export function buildProductSlides(
  coverUrl: string | null | undefined,
  gallery: ProductGallerySlideInput[] | null | undefined
): string[] {
  const slides: string[] = [];
  const seen = new Set<string>();

  const cover = normalizeUrl(coverUrl);
  if (cover) {
    slides.push(cover);
    seen.add(cover);
  }

  const rows = [...(gallery ?? [])].sort((a, b) => {
    const order = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (order !== 0) return order;
    return (a.created_at ?? '').localeCompare(b.created_at ?? '');
  });

  for (const row of rows) {
    const url = normalizeUrl(row.image_url);
    if (!url || seen.has(url)) continue;
    slides.push(url);
    seen.add(url);
    if (slides.length >= MAX_PRODUCT_SLIDES) break;
  }

  return slides;
}

export function readProductGallery(product: object | null | undefined): ProductGallerySlideInput[] {
  if (!product || !('gallery' in product)) return [];
  const gallery = (product as { gallery?: unknown }).gallery;
  if (!Array.isArray(gallery)) return [];

  return gallery.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const imageUrl = normalizeUrl((row as { image_url?: unknown }).image_url as string | null);
    if (!imageUrl) return [];
    const source = row as {
      id?: unknown;
      product_id?: unknown;
      sort_order?: unknown;
      created_at?: unknown;
    };
    return [
      {
        id: typeof source.id === 'string' ? source.id : undefined,
        product_id: typeof source.product_id === 'string' ? source.product_id : undefined,
        image_url: imageUrl,
        sort_order: typeof source.sort_order === 'number' ? source.sort_order : null,
        created_at: typeof source.created_at === 'string' ? source.created_at : null,
      },
    ];
  });
}
