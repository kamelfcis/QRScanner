'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (input, init) => {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return Promise.reject(new TypeError('Failed to fetch'));
          }
          return fetch(input, init);
        },
      },
    }
  );
}
