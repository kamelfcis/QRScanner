'use client';

import { Badge } from '@/components/ui/badge';
import { MotionSection } from '@/components/shared/motion';
import { Image } from '@/components/shared/Image';
import { useActiveOffers } from '@/hooks/useOffers';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';

export function OffersBanner() {
  const { data: offers, isLoading } = useActiveOffers();
  const { data: settings } = useRestaurantSettings();
  const currency = getRestaurantCurrency(settings?.currency);
  const t = useTranslations('landing');

  if (isLoading || !offers || offers.length === 0) return null;

  return (
    <section className="border-brand-accent/15 relative overflow-hidden border-y bg-black py-16 md:py-20">
      <div className="container mx-auto px-4">
        <MotionSection>
          <div className="mb-10 text-center">
            <h2 className="font-heading text-primary text-4xl font-bold md:text-5xl">
              {t('specialOffers')}
            </h2>
            <div className="bg-brand-accent mx-auto mt-4 h-1 w-20" />
          </div>
        </MotionSection>

        <div className="scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4">
          {offers.map((offer, index) => (
            <MotionSection key={offer.id} delay={index * 0.1}>
              <div className="group min-w-[300px] flex-shrink-0 snap-start overflow-hidden">
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
                    <div className="from-brand-secondary-dark flex h-full items-center justify-center bg-gradient-to-br to-black">
                      <span className="text-brand-accent font-heading text-4xl font-bold">
                        {offer.title_en.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute right-3 top-3">
                    <Badge className="bg-brand-accent text-black">
                      {offer.discount_type === 'percentage'
                        ? `${offer.discount_value}% OFF`
                        : `${formatCurrencyAmount(offer.discount_value, currency, { plain: true })} OFF`}
                    </Badge>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="font-heading text-lg font-bold text-white">{offer.title_en}</h3>
                    {offer.description_en && (
                      <p className="mt-1 line-clamp-2 text-sm text-white/75">
                        {offer.description_en}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </MotionSection>
          ))}
        </div>
      </div>
    </section>
  );
}
