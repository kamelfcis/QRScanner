/**
 * Self-hosted engazqr VPS APIs expose REST/auth/storage but not Supabase Realtime.
 * IIS/nginx WebSocket proxying to the Node stub fails with Sec-WebSocket-Accept errors.
 */
export function isSupabaseRealtimeEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_SUPABASE_REALTIME === 'false') return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  if (/^https:\/\/api\.[^/]+\.engazqr\.com/i.test(url)) return false;
  return true;
}
