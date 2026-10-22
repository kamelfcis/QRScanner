import { describe, expect, it } from 'vitest';
import { isUnavailableReadError } from '@/lib/supabase/isUnavailableReadError';

describe('isUnavailableReadError', () => {
  it('treats a Supabase 402 restriction payload as unavailable', () => {
    expect(
      isUnavailableReadError({
        message:
          'Service for this project is restricted due to the following violations: exceed_cached_egress_quota',
      })
    ).toBe(true);
  });

  it('treats auth and server status codes as unavailable', () => {
    expect(isUnavailableReadError({ message: 'unauthorized', status: 401 })).toBe(true);
    expect(isUnavailableReadError({ message: 'forbidden', status: 403 })).toBe(true);
    expect(isUnavailableReadError({ message: 'bad gateway', status: 502 })).toBe(true);
    expect(isUnavailableReadError({ code: 'PGRST301', message: 'JWT expired' })).toBe(true);
  });

  it('treats network failures as unavailable', () => {
    expect(isUnavailableReadError(new TypeError('Failed to fetch'))).toBe(true);
    expect(
      isUnavailableReadError({
        message: 'TypeError: Failed to fetch',
        details: '',
        hint: '',
        code: '',
      })
    ).toBe(true);
  });

  it('does not treat an empty catalog or unrelated bugs as unavailable', () => {
    expect(isUnavailableReadError(null)).toBe(false);
    expect(isUnavailableReadError(undefined)).toBe(false);
    expect(isUnavailableReadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(
      isUnavailableReadError({ name: 'AbortError', message: 'The operation was aborted' })
    ).toBe(false);
  });
});
