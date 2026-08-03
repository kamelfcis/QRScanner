'use client';

import { motion } from 'framer-motion';
import { useActiveOffers } from '@/hooks/useOffers';
import { Image } from '@/components/shared/Image';
import { MotionSection } from '@/components/shared/motion';
import { Badge } from '@/components/ui/badge';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { staggerContainer, staggerItem } from '@/lib/motion';

export function OffersSection() {
  const { data: offers, isLoading } = useActiveOffers();
  const prefersReducedMotion = useReducedMotion();

  if (isLoading || !offers?.length) return null;

  return (
    <MotionSection className="container mx-auto px-4 py-4">
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-4">
        <h2 className="mb-3 text-lg font-bold text-primary">Special Offers</h2>
        <motion.div
          initial={prefersReducedMotion ? undefined : 'hidden'}
          whileInView="visible"
          viewport={{ once: true }}
          variants={prefersReducedMotion ? undefined : staggerContainer}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
        >
          {offers.map((offer) => (
            <motion.div
              key={offer.id}
              variants={prefersReducedMotion ? undefined : staggerItem}
              className="min-w-[260px] shrink-0 overflow-hidden rounded-lg border bg-background shadow-sm"
            >
              {offer.image_url && (
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  <Image
                    src={offer.image_url}
                    alt={offer.title_en}
                    fill
                    className="object-cover"
                    sizes="260px"
                  />
                  <Badge className="absolute left-2 top-2 bg-accent text-foreground">
                    {offer.discount_type === 'percentage'
                      ? `${offer.discount_value}% OFF`
                      : `${offer.discount_value} SAR OFF`}
                  </Badge>
                </div>
              )}
              <div className="p-3">
                <h3 className="font-semibold">{offer.title_en}</h3>
                {offer.description_en && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {offer.description_en}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </MotionSection>
  );
}
