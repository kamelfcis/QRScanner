'use client';

import { createClient } from '@/lib/supabase/client';

export type StorageBucket = 'logos' | 'covers' | 'categories' | 'products' | 'gallery' | 'qr' | 'pdfs' | 'assets';

interface UploadOptions {
  bucket: StorageBucket;
  path: string;
  file: File;
}

interface UploadResult {
  url: string;
  path: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_SIZE_MB = 5;

export function validateImageFile(file: File, maxSizeMB: number = MAX_SIZE_MB): void {
  if (!ALLOWED_TYPES.includes(file.type as typeof ALLOWED_TYPES[number])) {
    throw new Error(`Invalid file type "${file.type}". Allowed: JPEG, PNG, WebP.`);
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds limit of ${maxSizeMB}MB.`);
  }
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
