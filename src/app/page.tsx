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
import { generateRestaurantSchema } from '@/lib/seo/structuredData';

export default function HomePage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(generateRestaurantSchema()) }}
        />
      </div>
    </Providers>
  );
}
