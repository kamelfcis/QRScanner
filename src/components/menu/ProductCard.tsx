'use client';

import { motion } from 'framer-motion';
import { Heart, Flame, Star, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/shared/Image';
import { MotionCard } from '@/components/shared/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { cn, getName } from '@/lib/utils';
import type { Product } from '@/types/database';

interface ProductCardProps {
  product: Product;
  diningMode: 'dining' | 'takeaway';
  isFavorite: boolean;
  onToggleFavorite: (product: Product) => void;
  onImageClick: (product: Product) => void;
}

export function ProductCard({
  product,
  diningMode,
  isFavorite,
  onToggleFavorite,
  onImageClick,
}: ProductCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const tCommon = useTranslations('common');
  const price = diningMode === 'dining' ? product.dining_price : product.takeaway_price;

  return (
    <MotionCard hover className="overflow-hidden">
      <Card className="overflow-hidden border-0 shadow-md transition-shadow hover:shadow-lg">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {product.image_url && (
            <Image
              src={product.image_url}
              alt={product.name_en}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="cursor-pointer object-cover transition-transform duration-300 hover:scale-105"
              containerClassName="aspect-[4/3]"
            />
          )}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {product.is_popular && (
              <Badge className="bg-primary text-primary-foreground">
                <Star className="mr-1 h-3 w-3" />
                {t('popular')}
              </Badge>
            )}
            {product.is_new && (
              <Badge className="bg-green-600 text-white">
                <Sparkles className="mr-1 h-3 w-3" />
                {t('new')}
              </Badge>
            )}
            {product.is_bestseller && (
              <Badge className="bg-purple-600 text-white">
                <Star className="mr-1 h-3 w-3" />
                {t('bestseller')}
              </Badge>
            )}
            {product.is_spicy && (
              <Badge className="bg-red-600 text-white">
                <Flame className="mr-1 h-3 w-3" />
                Spicy
              </Badge>
            )}
          </div>
          <motion.button
            whileTap={prefersReducedMotion ? undefined : { scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(product);
            }}
            className={cn(
              'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors',
              isFavorite
                ? 'bg-red-500 text-white'
                : 'bg-background/80 text-muted-foreground backdrop-blur-sm'
            )}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <motion.div
              animate={prefersReducedMotion ? undefined : { scale: isFavorite ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
            </motion.div>
          </motion.button>
        </div>

        <button
          type="button"
          className="block w-full text-left"
          onClick={() => onImageClick(product)}
        >
          <CardContent className="p-4">
            <div className="mb-2">
              <h3 className="font-semibold">
                {getName(locale, product.name_en, product.name_ar)}
              </h3>
              {locale !== 'ar' && product.name_ar && (
                <p className="text-sm text-muted-foreground" dir="rtl">
                  {product.name_ar}
                </p>
              )}
              {locale === 'ar' && product.name_en && (
                <p className="text-sm text-muted-foreground" dir="ltr">
                  {product.name_en}
                </p>
              )}
            </div>
            {product.description_en && (
              <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                {getName(locale, product.description_en, product.description_ar)}
              </p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-primary">
                {price} {tCommon('sar')}
              </p>
              {!product.is_available && (
                <Badge variant="secondary" aria-label={t('currentlyUnavailable')}>
                  {t('currentlyUnavailable')}
                </Badge>
              )}
            </div>
          </CardContent>
        </button>
      </Card>
    </MotionCard>
  );
}
