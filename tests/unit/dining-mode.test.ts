import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildMenuUrl,
  parseDiningModeParam,
  persistDiningMode,
  persistTableNumber,
  readStoredDiningMode,
  readStoredTableNumber,
  toDiningModeParam,
} from '@/lib/dining-mode';
import { buildWelcomeUrl, buildQrTargetUrl, getDefaultQrTargetPath } from '@/lib/qr/welcome-url';

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

  it('persists table number for QR flows', () => {
    expect(readStoredTableNumber()).toBeNull();
    persistTableNumber('7');
    expect(readStoredTableNumber()).toBe('7');
  });
});

describe('buildWelcomeUrl', () => {
  it('uses default QR target path without table', () => {
    const defaultPath = getDefaultQrTargetPath();
    const expected =
      defaultPath === '/' ? 'https://example.com' : `https://example.com${defaultPath}`;
    expect(buildWelcomeUrl('https://example.com')).toBe(expected);
  });

  it('includes table query for table QR codes', () => {
    const defaultPath = getDefaultQrTargetPath();
    const base = defaultPath === '/' ? 'https://example.com' : `https://example.com${defaultPath}`;
    expect(buildWelcomeUrl('https://example.com/', 12)).toBe(`${base}?table=12`);
  });

  it('supports explicit root path for Aklet Gambary', () => {
    expect(buildQrTargetUrl({ siteUrl: 'https://aklet-gambary.vercel.app', targetPath: '/' })).toBe(
      'https://aklet-gambary.vercel.app'
    );
    expect(
      buildQrTargetUrl({ siteUrl: 'https://aklet-gambary.vercel.app', targetPath: '/' }, 3)
    ).toBe('https://aklet-gambary.vercel.app?table=3');
  });

  it('supports /welcome path for Warda Shamya', () => {
    expect(buildQrTargetUrl({ siteUrl: 'https://warda.example.com', targetPath: '/welcome' })).toBe(
      'https://warda.example.com/welcome'
    );
  });
});
