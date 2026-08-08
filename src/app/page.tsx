import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Providers } from '@/components/providers/Providers';
import { PublicHeader } from '@/components/shared/layout/PublicHeader';
import { PublicFooter } from '@/components/shared/layout/PublicFooter';
import { HeroSection } from '@/components/landing/HeroSection';
import { StorySection } from '@/components/landing/StorySection';
import { FeaturedDishes } from '@/components/landing/FeaturedDishes';
import { GalleryPreview } from '@/components/landing/GalleryPreview';
import { OffersBanner } from '@/components/landing/OffersBanner';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { OpeningHours } from '@/components/landing/OpeningHours';
import { ContactSection } from '@/components/landing/ContactSection';
import { FloatingWhatsApp } from '@/components/landing/FloatingWhatsApp';
import { StructuredDataScript } from '@/components/seo/StructuredDataScript';
import { QrScanTracker } from '@/components/analytics/QrScanTracker';
import { createClient } from '@/lib/supabase/server';
import { prefetchLandingData } from '@/lib/catalog/prefetchLanding';
import { CATALOG_GC_TIME, CATALOG_STALE_TIME } from '@/lib/catalog/keys';

export default async function HomePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CATALOG_STALE_TIME,
        gcTime: CATALOG_GC_TIME,
      },
    },
  });

  try {
    const supabase = await createClient();
    await prefetchLandingData(supabase, queryClient);
  } catch {
    // Prefetch is best-effort
  }

  return (
    <>
      <QrScanTracker />
      <Providers>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <div className="flex min-h-screen w-full flex-col overflow-x-clip">
            <PublicHeader />
            <main className="flex-1" id="main-content">
              <HeroSection />
              <StorySection />
              <FeaturedDishes />
              <GalleryPreview />
              <OffersBanner />
              <TestimonialsSection />
              <OpeningHours />
              <ContactSection />
              <FloatingWhatsApp />
            </main>
            <PublicFooter />
          </div>
        </HydrationBoundary>
      </Providers>
      <StructuredDataScript />
    </>
  );
}
