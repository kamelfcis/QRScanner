'use client';

import {
  ServerDownScreen,
  StoreLoadingShell,
  useShowServerDown,
} from '@/components/shared/feedback/ServerDownScreen';
import { useVisibleGallery } from '@/hooks/useGallery';
import { useActiveOffers } from '@/hooks/useOffers';
import { usePopularProducts } from '@/hooks/useProducts';
import { useHoursSettings, useRestaurantSettings } from '@/hooks/useSettings';
import { useFeaturedTestimonials } from '@/hooks/useTestimonials';
import { isUnavailableReadError } from '@/lib/supabase/isUnavailableReadError';

function readFailed(query: { error: unknown }) {
  return isUnavailableReadError(query.error);
}

export function LandingStoreGate({ children }: { children: React.ReactNode }) {
  const settings = useRestaurantSettings();
  const products = usePopularProducts();
  const gallery = useVisibleGallery();
  const offers = useActiveOffers();
  const testimonials = useFeaturedTestimonials();
  const hours = useHoursSettings();

  const reads = [settings, products, gallery, offers, testimonials, hours];
  const unavailable = reads.some(readFailed);
  const showDown = useShowServerDown(unavailable);

  // Prefetched landing queries. Extras (offers, testimonials, hours) stay
  // non-blocking so a healthy server render can still paint the page.
  const core = [settings, products, gallery];
  const corePending = core.some((query) => query.isPending);
  const coreUnavailable = core.some(readFailed);

  if (showDown) return <ServerDownScreen />;
  if (corePending || coreUnavailable) return <StoreLoadingShell />;

  return children;
}
