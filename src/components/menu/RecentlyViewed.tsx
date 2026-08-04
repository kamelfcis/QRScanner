'use client';

import { Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/shared/Image';
import { MotionSection } from '@/components/shared/motion';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { useTranslations } from '@/components/providers/RootI18nProvider';

interface RecentlyViewedProps {
  onSelectProduct: (productId: string) => void;
}

export function RecentlyViewed({ onSelectProduct }: RecentlyViewedProps) {
  const { recent, clearRecent } = useRecentlyViewed();
  const prefersReducedMotion = useReducedMotion();
  const t = useTranslations('menu');
  const tCommon = useTranslations('common');

  if (!recent.length) return null;

  return (
    <MotionSection className="container mx-auto px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-bold">{t('recentlyViewed')}</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearRecent}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-3 w-3" />
          {t('clear')}
        </Button>
      </div>
      <motion.div
        initial={prefersReducedMotion ? undefined : 'hidden'}
        whileInView="visible"
        viewport={{ once: true }}
        variants={prefersReducedMotion ? undefined : staggerContainer}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
      >
        {recent.map((product) => (
          <motion.button
            key={product.id}
            variants={prefersReducedMotion ? undefined : staggerItem}
            onClick={() => onSelectProduct(product.id)}
            className="flex min-w-[140px] shrink-0 overflow-hidden rounded-lg border text-left transition-shadow hover:shadow-md"
          >
            {product.image_url && (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden">
                <Image
                  src={product.image_url}
                  alt={product.name_en}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            )}
            <div className="flex flex-col justify-center p-2">
              <h4 className="line-clamp-1 text-sm font-medium">{product.name_en}</h4>
              <p className="text-xs text-primary">{product.dining_price} {tCommon('sar')}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </MotionSection>
  );
}
