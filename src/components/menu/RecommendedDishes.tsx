'use client';

import { Sparkles } from 'lucide-react';
import { Image } from '@/components/shared/Image';
import { MotionSection } from '@/components/shared/motion';
import { usePopularProducts } from '@/hooks/useProducts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { useTranslations } from '@/components/providers/RootI18nProvider';

interface RecommendedDishesProps {
  onSelectProduct: (productId: string) => void;
}

export function RecommendedDishes({ onSelectProduct }: RecommendedDishesProps) {
  const { data: products, isLoading } = usePopularProducts();
  const prefersReducedMotion = useReducedMotion();
  const t = useTranslations('menu');
  const tCommon = useTranslations('common');

  if (isLoading || !products?.length) return null;

  return (
    <MotionSection className="container mx-auto px-4 py-6">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h2 className="text-lg font-bold">{t('recommended')}</h2>
      </div>
      <motion.div
        initial={prefersReducedMotion ? undefined : 'hidden'}
        whileInView="visible"
        viewport={{ once: true }}
        variants={prefersReducedMotion ? undefined : staggerContainer}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
      >
        {products.map((product) => (
          <motion.button
            key={product.id}
            variants={prefersReducedMotion ? undefined : staggerItem}
            onClick={() => onSelectProduct(product.id)}
            className="flex min-w-[160px] shrink-0 overflow-hidden rounded-lg border text-left transition-shadow hover:shadow-md"
          >
            {product.image_url && (
              <div className="relative h-24 w-24 shrink-0 overflow-hidden">
                <Image
                  src={product.image_url}
                  alt={product.name_en}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            )}
            <div className="flex flex-col justify-center p-3">
              <h4 className="line-clamp-1 text-sm font-medium">{product.name_en}</h4>
              <p className="mt-1 text-xs text-muted-foreground" dir="rtl">
                {product.name_ar}
              </p>
              <p className="mt-1 text-sm font-bold text-primary">
                {product.dining_price} {tCommon('sar')}
              </p>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </MotionSection>
  );
}
