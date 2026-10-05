'use client';

import { createClient } from '@/lib/supabase/client';
import { validateImageFile } from '@/lib/upload-validation';

export {
  validateImageFile,
  ImageValidationError,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_MB,
} from '@/lib/upload-validation';

export type StorageBucket =
  | 'logos'
  | 'covers'
  | 'categories'
  | 'products'
  | 'gallery'
  | 'qr'
  | 'pdfs'
  | 'assets'
  | 'instapay-proofs';

interface UploadOptions {
  bucket: StorageBucket;
  path: string;
  file: File;
}

interface UploadResult {
  url: string;
  path: string;
}

export async function uploadImage({ bucket, path, file }: UploadOptions): Promise<UploadResult> {
  validateImageFile(file);
  const supabase = createClient();

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
  });

  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { url: urlData.publicUrl, path: data.path };
}

export async function deleteImage(bucket: StorageBucket, path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(error.message);
}

export async function replaceImage({ bucket, path, file }: UploadOptions): Promise<UploadResult> {
  validateImageFile(file);
  const supabase = createClient();

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    upsert: true,
  });

  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { url: urlData.publicUrl, path: data.path };
}

export function generateStoragePath(bucket: StorageBucket, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
  const ext = safeName.split('.').pop() || 'jpg';
  return `${timestamp}-${random}.${ext}`;
}

export interface StorageImageItem {
  name: string;
  url: string;
  createdAt: string | null;
}

const STORAGE_LIST_PAGE_SIZE = 24;

export async function listStorageImages(
  bucket: StorageBucket,
  options: { limit?: number; offset?: number } = {}
): Promise<{ items: StorageImageItem[]; hasMore: boolean }> {
  const limit = options.limit ?? STORAGE_LIST_PAGE_SIZE;
  const offset = options.offset ?? 0;
  const supabase = createClient();

  const { data, error } = await supabase.storage.from(bucket).list('', {
    limit: limit + 1,
    offset,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error) throw new Error(error.message);

  const files = (data ?? []).filter(
    (file) =>
      file.metadata &&
      (file.metadata.mimetype?.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.name))
  );

  const hasMore = files.length > limit;
  const page = hasMore ? files.slice(0, limit) : files;

  const items = page.map((file) => {
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(file.name);
    return {
      name: file.name,
      url: urlData.publicUrl,
      createdAt: file.created_at ?? null,
    };
  });

  return { items, hasMore };
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
