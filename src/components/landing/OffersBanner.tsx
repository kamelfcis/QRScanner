'use client';

import { Badge } from '@/components/ui/badge';
import { MotionSection } from '@/components/shared/motion';
import { Image } from '@/components/shared/Image';
import { useActiveOffers } from '@/hooks/useOffers';
import { useTranslations } from '@/components/providers/RootI18nProvider';

export function OffersBanner() {
  const { data: offers, isLoading } = useActiveOffers();
  const t = useTranslations('landing');

  if (isLoading || !offers || offers.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-brand-primary/10 via-brand-accent/5 to-brand-primary/10 py-16 md:py-20">
      <div className="container mx-auto px-4">
        <MotionSection>
          <div className="mb-10 text-center">
            <h2 className="font-heading text-4xl font-bold text-primary md:text-5xl">
              {t('specialOffers')}
            </h2>
            <div className="mx-auto mt-4 h-1 w-20 rounded bg-brand-accent" />
          </div>
        </MotionSection>

        <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
          {offers.map((offer, index) => (
            <MotionSection key={offer.id} delay={index * 0.1}>
              <div className="group min-w-[300px] flex-shrink-0 snap-start overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
                <div className="relative aspect-[16/9] overflow-hidden">
                  {offer.image_url ? (
                    <Image
                      src={offer.image_url}
                      alt={offer.title_en}
                      fill
                      sizes="300px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-primary/20 to-brand-accent/20">
                      <span className="text-4xl font-bold text-brand-primary font-heading">
                        {offer.title_en.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="absolute right-3 top-3">
                    <Badge className="bg-brand-secondary text-white">
                      {offer.discount_type === 'percentage'
                        ? `${offer.discount_value}% OFF`
                        : `${offer.discount_value} OFF`}
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-heading text-lg font-semibold">{offer.title_en}</h3>
                  {offer.description_en && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {offer.description_en}
                    </p>
                  )}
                </div>
              </div>
            </MotionSection>
          ))}
        </div>
      </div>
    </section>
  );
}
