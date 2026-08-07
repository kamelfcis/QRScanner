'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { MotionSection, MotionCard } from '@/components/shared/motion';
import { Image } from '@/components/shared/Image';
import { useVisibleGallery } from '@/hooks/useGallery';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/components/providers/RootI18nProvider';

export function GalleryPreview() {
  const { data: gallery, isLoading } = useVisibleGallery();
  const t = useTranslations('landing');

  const displayItems = gallery?.slice(0, 8) || [];

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <MotionSection>
          <div className="mb-12 text-center">
            <h2 className="font-heading text-primary text-4xl font-bold md:text-5xl">
              {t('aTasteOfExcellence')}
            </h2>
            <div className="bg-brand-accent mx-auto mt-4 h-1 w-20 rounded" />
          </div>
        </MotionSection>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton
                key={i}
                className={cn('rounded-xl', i % 3 === 0 ? 'aspect-square' : 'aspect-[4/3]')}
              />
            ))}
          </div>
        ) : displayItems.length === 0 ? (
          <p className="text-muted-foreground text-center">{t('galleryComingSoon')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {displayItems.map((item, index) => (
              <MotionCard
                key={item.id}
                delay={index * 0.05}
                className={cn(
                  'group relative overflow-hidden',
                  index % 5 === 0 ? 'row-span-2 aspect-square' : 'aspect-[4/3]'
                )}
              >
                <Image
                  src={item.image_url}
                  alt={item.caption_en || t('galleryComingSoon')}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                {item.caption_en && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-sm text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {item.caption_en}
                  </div>
                )}
              </MotionCard>
            ))}
          </div>
        )}

        <MotionSection delay={0.3}>
          <div className="mt-8 text-center">
            <Link
              href="/menu#gallery"
              className="text-primary inline-flex items-center text-sm font-medium hover:underline"
            >
              {t('viewGallery')}
            </Link>
          </div>
        </MotionSection>
      </div>
    </section>
  );
}
