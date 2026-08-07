'use client';

import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ProductCard } from './ProductCard';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/database';

interface ProductGridProps {
  products: Product[];
  diningMode: 'dining' | 'takeaway';
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (product: Product) => void;
  onImageClick: (product: Product) => void;
  onAddedToCart?: () => void;
  className?: string;
}

export function ProductGrid({
  products,
  diningMode,
  isFavorite,
  onToggleFavorite,
  onImageClick,
  onAddedToCart,
  className,
}: ProductGridProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? undefined : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={prefersReducedMotion ? undefined : staggerContainer}
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={prefersReducedMotion ? undefined : staggerItem}>
          <ProductCard
            product={product}
            diningMode={diningMode}
            isFavorite={isFavorite(product.id)}
            onToggleFavorite={onToggleFavorite}
            onImageClick={onImageClick}
            onAddedToCart={onAddedToCart}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
