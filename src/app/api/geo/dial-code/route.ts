import { NextResponse } from 'next/server';
import {
  DEFAULT_COUNTRY,
  getCountryPrefix,
  getDialCode,
  resolveCountryCode,
} from '@/lib/phone/country-dial';

export const runtime = 'edge';

function countryFromHeaders(request: Request): string | null {
  const vercel = request.headers.get('x-vercel-ip-country')?.trim();
  if (vercel && vercel !== 'XX') return vercel.toUpperCase();

  const cf = request.headers.get('cf-ipcountry')?.trim();
  if (cf && cf !== 'XX') return cf.toUpperCase();

  return null;
}

export async function GET(request: Request) {
  const country = resolveCountryCode(countryFromHeaders(request));
  const dialCode = getDialCode(country);

  return NextResponse.json({
    country,
    dialCode,
    prefix: getCountryPrefix(country),
    source: countryFromHeaders(request) ? 'ip' : 'default',
    defaultCountry: DEFAULT_COUNTRY,
  });
}
