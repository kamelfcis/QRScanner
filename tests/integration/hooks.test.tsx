import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports useAuth function', async () => {
    const { useAuth } = await import('@/hooks/useAuth');
    expect(typeof useAuth).toBe('function');
  });

  it('initializes with loading state', async () => {
    const { useAuth } = await import('@/hooks/useAuth');
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    expect(result.current.loading).toBe(true);
  });

  it('provides signIn function', async () => {
    const { useAuth } = await import('@/hooks/useAuth');
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    expect(typeof result.current.signIn).toBe('function');
  });

  it('provides signOut function', async () => {
    const { useAuth } = await import('@/hooks/useAuth');
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    expect(typeof result.current.signOut).toBe('function');
  });

  it('has isAuthenticated property', async () => {
    const { useAuth } = await import('@/hooks/useAuth');
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    expect(typeof result.current.isAuthenticated).toBe('boolean');
  });
});

describe('useCategories hook exports', () => {
  it('exports useCategories', async () => {
    const mod = await import('@/hooks/useCategories');
    expect(typeof mod.useCategories).toBe('function');
  });

  it('exports useAllCategories', async () => {
    const mod = await import('@/hooks/useCategories');
    expect(typeof mod.useAllCategories).toBe('function');
  });

  it('exports useCreateCategory', async () => {
    const mod = await import('@/hooks/useCategories');
    expect(typeof mod.useCreateCategory).toBe('function');
  });

  it('exports useUpdateCategory', async () => {
    const mod = await import('@/hooks/useCategories');
    expect(typeof mod.useUpdateCategory).toBe('function');
  });

  it('exports useDeleteCategory', async () => {
    const mod = await import('@/hooks/useCategories');
    expect(typeof mod.useDeleteCategory).toBe('function');
  });

  it('exports useReorderCategories', async () => {
    const mod = await import('@/hooks/useCategories');
    expect(typeof mod.useReorderCategories).toBe('function');
  });

  it('exports categoryKeys', async () => {
    const mod = await import('@/hooks/useCategories');
    expect(mod.categoryKeys.all).toEqual(['categories']);
    expect(mod.categoryKeys.visible()).toEqual(['categories', 'visible']);
    expect(mod.categoryKeys.allList()).toEqual(['categories', 'allList']);
  });
});

describe('useProducts hook exports', () => {
  it('exports useProducts', async () => {
    const mod = await import('@/hooks/useProducts');
    expect(typeof mod.useProducts).toBe('function');
  });

  it('exports useCreateProduct', async () => {
    const mod = await import('@/hooks/useProducts');
    expect(typeof mod.useCreateProduct).toBe('function');
  });

  it('exports useUpdateProduct', async () => {
    const mod = await import('@/hooks/useProducts');
    expect(typeof mod.useUpdateProduct).toBe('function');
  });

  it('exports useDeleteProduct', async () => {
    const mod = await import('@/hooks/useProducts');
    expect(typeof mod.useDeleteProduct).toBe('function');
  });

  it('exports productKeys', async () => {
    const mod = await import('@/hooks/useProducts');
    expect(mod.productKeys.all).toEqual(['products']);
  });
});

describe('useOffers hook exports', () => {
  it('exports useActiveOffers', async () => {
    const mod = await import('@/hooks/useOffers');
    expect(typeof mod.useActiveOffers).toBe('function');
  });

  it('exports useAllOffers', async () => {
    const mod = await import('@/hooks/useOffers');
    expect(typeof mod.useAllOffers).toBe('function');
  });

  it('exports useCreateOffer', async () => {
    const mod = await import('@/hooks/useOffers');
    expect(typeof mod.useCreateOffer).toBe('function');
  });

  it('exports useUpdateOffer', async () => {
    const mod = await import('@/hooks/useOffers');
    expect(typeof mod.useUpdateOffer).toBe('function');
  });

  it('exports useDeleteOffer', async () => {
    const mod = await import('@/hooks/useOffers');
    expect(typeof mod.useDeleteOffer).toBe('function');
  });
});

describe('useGallery hook exports', () => {
  it('exports useVisibleGallery', async () => {
    const mod = await import('@/hooks/useGallery');
    expect(typeof mod.useVisibleGallery).toBe('function');
  });

  it('exports useAllGallery', async () => {
    const mod = await import('@/hooks/useGallery');
    expect(typeof mod.useAllGallery).toBe('function');
  });

  it('exports useCreateGalleryItem', async () => {
    const mod = await import('@/hooks/useGallery');
    expect(typeof mod.useCreateGalleryItem).toBe('function');
  });

  it('exports useDeleteGalleryItem', async () => {
    const mod = await import('@/hooks/useGallery');
    expect(typeof mod.useDeleteGalleryItem).toBe('function');
  });
});

describe('useQRCodes hook exports', () => {
  it('exports useQRCodes', async () => {
    const mod = await import('@/hooks/useQRCodes');
    expect(typeof mod.useQRCodes).toBe('function');
  });

  it('exports useCreateQRCode', async () => {
    const mod = await import('@/hooks/useQRCodes');
    expect(typeof mod.useCreateQRCode).toBe('function');
  });

  it('exports useUpdateQRCode', async () => {
    const mod = await import('@/hooks/useQRCodes');
    expect(typeof mod.useUpdateQRCode).toBe('function');
  });

  it('exports useDeleteQRCode', async () => {
    const mod = await import('@/hooks/useQRCodes');
    expect(typeof mod.useDeleteQRCode).toBe('function');
  });

  it('exports useDuplicateQRCode', async () => {
    const mod = await import('@/hooks/useQRCodes');
    expect(typeof mod.useDuplicateQRCode).toBe('function');
  });
});

describe('useRestaurantTables hook exports', () => {
  it('exports useRestaurantTables', async () => {
    const mod = await import('@/hooks/useRestaurantTables');
    expect(typeof mod.useRestaurantTables).toBe('function');
  });

  it('exports useCreateTable', async () => {
    const mod = await import('@/hooks/useRestaurantTables');
    expect(typeof mod.useCreateTable).toBe('function');
  });

  it('exports useUpdateTable', async () => {
    const mod = await import('@/hooks/useRestaurantTables');
    expect(typeof mod.useUpdateTable).toBe('function');
  });

  it('exports useDeleteTable', async () => {
    const mod = await import('@/hooks/useRestaurantTables');
    expect(typeof mod.useDeleteTable).toBe('function');
  });
});

describe('useSettings hook exports', () => {
  it('exports useRestaurantSettings', async () => {
    const mod = await import('@/hooks/useSettings');
    expect(typeof mod.useRestaurantSettings).toBe('function');
  });

  it('exports useUpdateRestaurantSettings', async () => {
    const mod = await import('@/hooks/useSettings');
    expect(typeof mod.useUpdateRestaurantSettings).toBe('function');
  });
});

describe('useImportJobs hook exports', () => {
  it('exports useImportJobs', async () => {
    const mod = await import('@/hooks/useImportJobs');
    expect(typeof mod.useImportJobs).toBe('function');
  });

  it('exports useDeleteImportJob', async () => {
    const mod = await import('@/hooks/useImportJobs');
    expect(typeof mod.useDeleteImportJob).toBe('function');
  });
});
