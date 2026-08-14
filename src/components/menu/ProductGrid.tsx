'use client';

import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ProductCard } from './ProductCard';
import { cn } from '@/lib/utils';
import type { MarketCategoryKind } from '@/lib/market/catalog';
import type { Product } from '@/types/database';

interface ProductGridProps {
  products: Product[];
  diningMode: 'dining' | 'takeaway';
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (product: Product) => void;
  onOpenDetails: (product: Product) => void;
  onAddedToCart?: () => void;
  /** Single kind for a category shelf, or a per-product resolver for mixed lists. */
  categoryKind: MarketCategoryKind | ((product: Product) => MarketCategoryKind);
  className?: string;
}

export function ProductGrid({
  products,
  diningMode,
  isFavorite,
  onToggleFavorite,
  onOpenDetails,
  onAddedToCart,
  categoryKind,
  className,
}: ProductGridProps) {
  const prefersReducedMotion = useReducedMotion();
  const resolveKind = (product: Product) =>
    typeof categoryKind === 'function' ? categoryKind(product) : categoryKind;

  return (
    <motion.div
      initial={prefersReducedMotion ? undefined : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={prefersReducedMotion ? undefined : staggerContainer}
      className={cn(
        'grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        className
      )}
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={prefersReducedMotion ? undefined : staggerItem}>
          <ProductCard
            product={product}
            diningMode={diningMode}
            categoryKind={resolveKind(product)}
            isFavorite={isFavorite(product.id)}
            onToggleFavorite={onToggleFavorite}
            onOpenDetails={onOpenDetails}
            onAddedToCart={onAddedToCart}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
