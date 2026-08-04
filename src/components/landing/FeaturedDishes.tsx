'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MotionSection, MotionCard } from '@/components/shared/motion';
import { Image } from '@/components/shared/Image';
import { usePopularProducts } from '@/hooks/useProducts';
import { useTranslations } from '@/components/providers/RootI18nProvider';

export function FeaturedDishes() {
  const { data: products, isLoading } = usePopularProducts();
  const t = useTranslations('landing');
  const menuT = useTranslations('menu');

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <MotionSection>
          <div className="mb-12 text-center">
            <h2 className="font-heading text-4xl font-bold text-primary md:text-5xl">
              {t('signatureDishes')}
            </h2>
            <div className="mx-auto mt-4 h-1 w-20 rounded bg-brand-accent" />
          </div>
        </MotionSection>

        {isLoading ? (
          <div className="flex gap-6 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="min-w-[280px] flex-shrink-0">
                <Skeleton className="aspect-[4/3] rounded-xl" />
                <Skeleton className="mt-3 h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-1/4" />
              </div>
            ))}
          </div>
        ) : !products || products.length === 0 ? (
          <p className="text-center text-muted-foreground">{t('noFeaturedDishes')}</p>
        ) : (
          <div className="relative">
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
              {products.map((product, index) => (
                <MotionCard
                  key={product.id}
                  delay={index * 0.1}
                  className="min-w-[280px] flex-shrink-0 snap-start"
                >
                  <div className="group overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name_en}
                          fill
                          sizes="280px"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-muted">
                          <span className="text-3xl font-bold text-muted-foreground/30 font-heading">
                            {product.name_en.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="absolute left-3 top-3">
                        <Badge className="bg-brand-accent text-black">{menuT('popular')}</Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-heading text-lg font-semibold">{product.name_en}</h3>
                      <p className="mt-1 text-sm font-medium text-primary">
                        {product.dining_price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </MotionCard>
              ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-background to-transparent" />
          </div>
        )}

        <MotionSection delay={0.3}>
          <div className="mt-8 text-center">
            <Link
              href="/menu"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              {t('viewFullMenu')}
            </Link>
          </div>
        </MotionSection>
      </div>
    </section>
  );
}
