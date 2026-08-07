import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchRestaurantSettings } from '@/lib/settings/fetchRestaurantSettings';

export const SITE_ICON_REVALIDATE = 300;

async function readFallbackSvg(): Promise<Response> {
  const svg = await readFile(path.join(process.cwd(), 'public/favicon.svg'));
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': `public, max-age=${SITE_ICON_REVALIDATE}, stale-while-revalidate=600`,
    },
  });
}

/** Fetches the dashboard logo for use by app/icon and app/apple-icon routes. */
export async function fetchDynamicSiteIconResponse(): Promise<Response> {
  const settings = await fetchRestaurantSettings();
  const logoUrl = settings?.logo_url?.trim();

  if (logoUrl) {
    try {
      const response = await fetch(logoUrl, { next: { revalidate: SITE_ICON_REVALIDATE } });
      if (response.ok) {
        const data = await response.arrayBuffer();
        return new Response(data, {
          headers: {
            'Content-Type': response.headers.get('Content-Type') ?? 'image/png',
            'Cache-Control': `public, max-age=${SITE_ICON_REVALIDATE}, stale-while-revalidate=600`,
          },
        });
      }
    } catch {
      // fall through to branded default
    }
  }

  return readFallbackSvg();
}
