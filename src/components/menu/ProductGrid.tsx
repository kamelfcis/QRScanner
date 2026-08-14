'use client';

import { motion } from 'framer-motion';
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
    <div className={cn('grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4', className)}>
      {products.map((product) => (
        <motion.div
          key={product.id}
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
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
    </div>
  );
}
