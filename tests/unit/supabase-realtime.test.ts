import { describe, expect, it, vi, afterEach } from 'vitest';

describe('isSupabaseRealtimeEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('disables realtime for engazqr VPS API hosts', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://api.makhboz.engazqr.com');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_REALTIME', '');
    const { isSupabaseRealtimeEnabled } = await import('@/lib/supabase/realtime');
    expect(isSupabaseRealtimeEnabled()).toBe(false);
  });

  it('honours NEXT_PUBLIC_SUPABASE_REALTIME=false', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_REALTIME', 'false');
    const { isSupabaseRealtimeEnabled } = await import('@/lib/supabase/realtime');
    expect(isSupabaseRealtimeEnabled()).toBe(false);
  });

  it('keeps realtime enabled for hosted Supabase', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_REALTIME', '');
    const { isSupabaseRealtimeEnabled } = await import('@/lib/supabase/realtime');
    expect(isSupabaseRealtimeEnabled()).toBe(true);
  });
});
