import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractRestaurantLogoUrl,
  fetchLiveLogoFromCustomerDb,
  LIVE_LOGO_CACHE_TTL_SECONDS,
} from './resolve-live-logos';

const mockFrom = vi.fn();
const mockCreateServiceRoleClient = vi.fn(() => ({ from: mockFrom }));
const mockDecryptJson = vi.fn();
const mockCreateCustomerClient = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}));

vi.mock('@/lib/crypto/secrets', () => ({
  decryptJson: (...args: unknown[]) => mockDecryptJson(...args),
}));

vi.mock('@/server/provision/customer-supabase', () => ({
  createCustomerClient: (...args: unknown[]) => mockCreateCustomerClient(...args),
}));

describe('extractRestaurantLogoUrl', () => {
  it('returns trimmed logo_url when present', () => {
    expect(extractRestaurantLogoUrl({ logo_url: '  https://cdn.example/logo.png  ' })).toBe(
      'https://cdn.example/logo.png'
    );
  });

  it('returns null for missing or empty values', () => {
    expect(extractRestaurantLogoUrl(null)).toBeNull();
    expect(extractRestaurantLogoUrl({ logo_url: '   ' })).toBeNull();
    expect(extractRestaurantLogoUrl({ name: 'test' })).toBeNull();
  });
});

describe('LIVE_LOGO_CACHE_TTL_SECONDS', () => {
  it('uses a 60 second revalidation window', () => {
    expect(LIVE_LOGO_CACHE_TTL_SECONDS).toBe(60);
  });
});

describe('fetchLiveLogoFromCustomerDb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when customer secrets are missing', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    await expect(fetchLiveLogoFromCustomerDb('cust-1')).resolves.toBeNull();
    expect(mockCreateCustomerClient).not.toHaveBeenCalled();
  });

  it('returns null when secrets cannot be decrypted', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { ciphertext: 'x', iv: 'y', auth_tag: 'z' },
            error: null,
          }),
        }),
      }),
    });
    mockDecryptJson.mockImplementation(() => {
      throw new Error('bad ciphertext');
    });

    await expect(fetchLiveLogoFromCustomerDb('cust-2')).resolves.toBeNull();
  });

  it('returns null when decrypted payload is not customer secrets', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { ciphertext: 'x', iv: 'y', auth_tag: 'z' },
            error: null,
          }),
        }),
      }),
    });
    mockDecryptJson.mockReturnValue({ type: 'self_service_registration' });

    await expect(fetchLiveLogoFromCustomerDb('cust-3')).resolves.toBeNull();
  });

  it('returns live logo url from customer settings', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { ciphertext: 'x', iv: 'y', auth_tag: 'z' },
            error: null,
          }),
        }),
      }),
    });
    mockDecryptJson.mockReturnValue({
      supabaseUrl: 'https://example.supabase.co',
      supabaseServiceRoleKey: 'service-role-key',
    });
    mockCreateCustomerClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { value: { logo_url: 'https://cdn.example/live.png' } },
              error: null,
            }),
          }),
        }),
      }),
    });

    await expect(fetchLiveLogoFromCustomerDb('cust-4')).resolves.toBe(
      'https://cdn.example/live.png'
    );
  });

  it('returns null when customer settings query fails', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { ciphertext: 'x', iv: 'y', auth_tag: 'z' },
            error: null,
          }),
        }),
      }),
    });
    mockDecryptJson.mockReturnValue({
      supabaseUrl: 'https://example.supabase.co',
      supabaseServiceRoleKey: 'service-role-key',
    });
    mockCreateCustomerClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'settings unavailable' },
            }),
          }),
        }),
      }),
    });

    await expect(fetchLiveLogoFromCustomerDb('cust-5')).resolves.toBeNull();
  });
});
