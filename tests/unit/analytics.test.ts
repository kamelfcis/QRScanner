import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    })),
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, error: null })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

describe('Analytics hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports analytics keys', async () => {
    const { analyticsKeys } = await import('@/hooks/useAnalytics');
    expect(analyticsKeys).toBeDefined();
    expect(analyticsKeys.all).toEqual(['analytics']);
  });

  it('exports dashboard keys', async () => {
    const { dashboardKeys } = await import('@/hooks/useDashboardStats');
    expect(dashboardKeys).toBeDefined();
    expect(dashboardKeys.all).toEqual(['dashboard']);
  });

  it('exports notification keys', async () => {
    const { notificationKeys } = await import('@/hooks/useNotifications');
    expect(notificationKeys).toBeDefined();
    expect(notificationKeys.all).toEqual(['notifications']);
  });

  it('exports export hook', async () => {
    const { useExport } = await import('@/hooks/useExport');
    expect(useExport).toBeDefined();
    expect(typeof useExport).toBe('function');
  });

  it('exports realtime hook', async () => {
    const { useRealtimeAnalytics } = await import('@/hooks/useRealtime');
    expect(useRealtimeAnalytics).toBeDefined();
    expect(typeof useRealtimeAnalytics).toBe('function');
  });

  it('exports search tracking hook', async () => {
    const { useSearchTracking } = await import('@/hooks/useSearchTracking');
    expect(useSearchTracking).toBeDefined();
    expect(typeof useSearchTracking).toBe('function');
  });
});
