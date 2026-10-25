export function getStoragePublicUrl(bucket: string, path: string): string {
  const cleanPath = path.replace(/^\/+/, '');
  const cdn = process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL?.replace(/\/$/, '');
  if (cdn) return `${cdn}/${bucket}/${cleanPath}`;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || '';
  return `${base}/storage/v1/object/public/${bucket}/${cleanPath}`;
}
