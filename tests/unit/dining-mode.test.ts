import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildMenuUrl,
  parseDiningModeParam,
  persistDiningMode,
  readStoredDiningMode,
  toDiningModeParam,
} from '@/lib/dining-mode';
import { buildWelcomeUrl } from '@/lib/qr/welcome-url';

describe('parseDiningModeParam', () => {
  it('accepts dine_in and dining as dine-in', () => {
    expect(parseDiningModeParam('dine_in')).toBe('dining');
    expect(parseDiningModeParam('dining')).toBe('dining');
  });

  it('accepts takeaway', () => {
    expect(parseDiningModeParam('takeaway')).toBe('takeaway');
  });

  it('returns null for unknown values', () => {
    expect(parseDiningModeParam(null)).toBeNull();
    expect(parseDiningModeParam('delivery')).toBeNull();
  });
});

describe('toDiningModeParam', () => {
  it('serializes dine-in as dine_in', () => {
    expect(toDiningModeParam('dining')).toBe('dine_in');
  });

  it('serializes takeaway unchanged', () => {
    expect(toDiningModeParam('takeaway')).toBe('takeaway');
  });
});

describe('buildMenuUrl', () => {
  it('includes mode=dine_in for dining', () => {
    expect(buildMenuUrl('dining')).toBe('/menu?mode=dine_in');
  });

  it('preserves table parameter', () => {
    expect(buildMenuUrl('dining', '12')).toBe('/menu?mode=dine_in&table=12');
    expect(buildMenuUrl('takeaway', '5')).toBe('/menu?mode=takeaway&table=5');
  });
});

describe('dining mode persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads and writes localStorage', () => {
    expect(readStoredDiningMode()).toBe('dining');
    persistDiningMode('takeaway');
    expect(readStoredDiningMode()).toBe('takeaway');
  });
});

describe('buildWelcomeUrl', () => {
  it('points QR codes to welcome without table', () => {
    expect(buildWelcomeUrl('https://example.com')).toBe('https://example.com/welcome');
  });

  it('includes table query for table QR codes', () => {
    expect(buildWelcomeUrl('https://example.com/', 12)).toBe(
      'https://example.com/welcome?table=12'
    );
  });
});
