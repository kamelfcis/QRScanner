'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SearchAnalyticInput } from '@/types/schema';

const supabase = createClient();

export function useSearchTracking() {
  const trackSearch = useCallback(async (input: SearchAnalyticInput) => {
    try {
      await supabase.from('search_analytics').insert({
        search_term: input.search_term,
        results_count: input.results_count,
        category_id: input.category_id || null,
        user_agent: navigator.userAgent,
      });
    } catch {
      // Silently fail — tracking should not break UX
    }
  }, []);

  return { trackSearch };
}
