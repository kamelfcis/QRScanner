import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type SwRouting = {
  CACHE_NAME: string;
  LEGACY_CACHE_NAMES: string[];
  getRouteStrategy: (
    url: URL,
    request: Pick<Request, 'method' | 'mode' | 'destination'>
  ) => 'cache-first' | 'stale-while-revalidate' | 'network-first' | 'network-only';
};

function loadSwRouting(): SwRouting {
  const code = readFileSync(join(process.cwd(), 'public/sw-routing.js'), 'utf8');
  const cjsModule = { exports: {} as SwRouting };
  const runner = new Function('module', 'globalThis', `${code}\nreturn module.exports;`);
  return runner(cjsModule, globalThis) as SwRouting;
}

describe('sw-routing strategies', () => {
  const routing = loadSwRouting();

  it('uses warda-pwa-v2 cache name', () => {
    expect(routing.CACHE_NAME).toBe('warda-pwa-v2');
    expect(routing.LEGACY_CACHE_NAMES).toContain('doctorburger-v1');
  });

  it('cache-first for static assets and icons', () => {
    const url = new URL('https://hettsamaka.engazqr.com/_next/static/chunks/main.js');
    expect(
      routing.getRouteStrategy(url, { method: 'GET', mode: 'cors', destination: 'script' })
    ).toBe('cache-first');

    const iconUrl = new URL('https://hettsamaka.engazqr.com/icons/icon.svg');
    expect(
      routing.getRouteStrategy(iconUrl, { method: 'GET', mode: 'cors', destination: 'image' })
    ).toBe('cache-first');
  });

  it('stale-while-revalidate for menu snapshot API', () => {
    const url = new URL('https://hettsamaka.engazqr.com/api/menu/snapshot');
    expect(routing.getRouteStrategy(url, { method: 'GET', mode: 'cors', destination: '' })).toBe(
      'stale-while-revalidate'
    );
  });

  it('network-first for HTML navigations', () => {
    const url = new URL('https://hettsamaka.engazqr.com/menu');
    expect(
      routing.getRouteStrategy(url, { method: 'GET', mode: 'navigate', destination: 'document' })
    ).toBe('network-first');
  });

  it('network-only for other API routes and Supabase', () => {
    const ordersUrl = new URL('https://hettsamaka.engazqr.com/api/orders');
    expect(
      routing.getRouteStrategy(ordersUrl, { method: 'GET', mode: 'cors', destination: '' })
    ).toBe('network-only');

    const supabaseUrl = new URL('https://abc.supabase.co/rest/v1/categories');
    expect(
      routing.getRouteStrategy(supabaseUrl, { method: 'GET', mode: 'cors', destination: '' })
    ).toBe('network-only');
  });

  it('network-only for non-GET requests', () => {
    const url = new URL('https://hettsamaka.engazqr.com/api/menu/snapshot');
    expect(routing.getRouteStrategy(url, { method: 'POST', mode: 'cors', destination: '' })).toBe(
      'network-only'
    );
  });
});
