import type { SupabaseClient } from '@supabase/supabase-js';
import { extensionForMime, type GeneratedImageBytes } from '@/lib/ai/product-image';
import { getStoragePublicUrl } from '@/lib/storage-public-url';

const PRODUCTS_BUCKET = 'products';

export async function uploadImageToProductsBucket(
  supabase: SupabaseClient,
  storagePath: string,
  image: GeneratedImageBytes
): Promise<{ path: string; url: string }> {
  const { data, error } = await supabase.storage
    .from(PRODUCTS_BUCKET)
    .upload(storagePath, image.data, {
      contentType: image.mimeType,
      cacheControl: '31536000',
      upsert: false,
    });
  if (error) {
    throw new Error(error.message);
  }
  return { path: data.path, url: getStoragePublicUrl(PRODUCTS_BUCKET, data.path) };
}

export async function uploadAiCandidates(
  supabase: SupabaseClient,
  userId: string,
  images: GeneratedImageBytes[]
): Promise<Array<{ id: string; url: string }>> {
  const timestamp = Date.now();
  const uploaded = await Promise.all(
    images.map(async (image, index) => {
      const ext = extensionForMime(image.mimeType);
      const path = `ai-candidates/${userId}/${timestamp}-${index + 1}.${ext}`;
      const result = await uploadImageToProductsBucket(supabase, path, image);
      return { id: result.path, url: result.url };
    })
  );
  return uploaded;
}

export async function uploadAiProductImage(
  supabase: SupabaseClient,
  productId: string,
  image: GeneratedImageBytes
): Promise<{ path: string; url: string }> {
  const timestamp = Date.now();
  const ext = extensionForMime(image.mimeType);
  const path = `ai/${productId}/${timestamp}.${ext}`;
  return uploadImageToProductsBucket(supabase, path, image);
}
