'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_COUNTRY,
  countryFromCurrency,
  countryFromTimezone,
  getCountryName,
  getCountryPrefix,
  getDialCode,
  resolveCountryCode,
} from '@/lib/phone/country-dial';

export interface DetectedDialCode {
  country: string;
  dialCode: string;
  prefix: string;
  countryName: string;
  ready: boolean;
}

interface GeoDialResponse {
  country?: string;
  dialCode?: string;
  prefix?: string;
}

function detectClientCountry(currency?: string | null): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fromTz = countryFromTimezone(tz);
    if (fromTz) return fromTz;
  } catch {
    // ignore
  }

  const fromCurrency = countryFromCurrency(currency);
  if (fromCurrency) return fromCurrency;

  return DEFAULT_COUNTRY;
}

export function useDetectedDialCode(
  locale: string,
  options?: { currency?: string | null }
): DetectedDialCode {
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      try {
        const res = await fetch('/api/geo/dial-code', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as GeoDialResponse;
          if (!cancelled && data.country) {
            setCountry(resolveCountryCode(data.country));
            setReady(true);
            return;
          }
        }
      } catch {
        // fall through to client heuristics
      }

      if (!cancelled) {
        setCountry(detectClientCountry(options?.currency));
        setReady(true);
      }
    }

    detect();
    return () => {
      cancelled = true;
    };
  }, [options?.currency]);

  return useMemo(() => {
    const resolved = resolveCountryCode(country);
    return {
      country: resolved,
      dialCode: getDialCode(resolved),
      prefix: getCountryPrefix(resolved),
      countryName: getCountryName(resolved, locale),
      ready,
    };
  }, [country, locale, ready]);
}
