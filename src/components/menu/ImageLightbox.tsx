'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/shared/Image';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCartStore } from '@/stores/cart-store';
import { trackAddToCart } from '@/lib/analytics';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import type { Product } from '@/types/database';

interface ImageLightboxProps {
  product: Product | null;
  onClose: () => void;
}

export function ImageLightbox({ product, onClose }: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [touchDistance, setTouchDistance] = useState<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const tCart = useTranslations('cart');
  const addItem = useCartStore((s) => s.addItem);
  const diningMode = useCartStore((s) => s.diningMode);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (product) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [product, handleEscape]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset zoom on product change
    setZoom(1);
  }, [product]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setTouchDistance(Math.sqrt(dx * dx + dy * dy));
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistance !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.sqrt(dx * dx + dy * dy);
      const scale = newDistance / touchDistance;
      setZoom((prev) => Math.min(Math.max(prev * scale, 0.5), 3));
      setTouchDistance(newDistance);
    }
  };

  const handleTouchEnd = () => {
    setTouchDistance(null);
  };

  if (!product) return null;

  const productName = getName(locale, product.name_en, product.name_ar);
  const images = product.image_url ? [product.image_url] : [];

  const handleAddToCart = () => {
    if (!product.is_available) return;
    addItem({
      productId: product.id,
      name_en: product.name_en,
      name_ar: product.name_ar,
      image_url: product.image_url,
      dining_price: product.dining_price,
      takeaway_price: product.takeaway_price,
      quantity: 1,
      notes: '',
    });
    trackAddToCart(product.id, 1, diningMode);
    onClose();
  };

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={productName}
          initial={prefersReducedMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
          onClick={onClose}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 h-11 w-11 text-white hover:text-white/80"
            aria-label={t('closeLightbox')}
          >
            <X className="h-6 w-6" />
          </Button>

          <div className="absolute bottom-20 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:bottom-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setZoom((prev) => Math.max(prev - 0.5, 0.5));
              }}
              className="h-11 w-11 text-white hover:text-white/80"
              aria-label={t('zoomOut')}
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <span className="flex items-center text-sm text-white/80" aria-live="polite">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setZoom((prev) => Math.min(prev + 0.5, 3));
              }}
              className="h-11 w-11 text-white hover:text-white/80"
              aria-label={t('zoomIn')}
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
          </div>

          <motion.div
            initial={prefersReducedMotion ? undefined : { scale: 0.95, opacity: 0 }}
            animate={{ scale: zoom, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            className="relative max-h-[70vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {images.length > 0 && (
              <Image
                src={images[0]}
                alt={productName}
                width={800}
                height={600}
                className="max-h-[70vh] w-auto rounded-lg object-contain"
                priority
              />
            )}
          </motion.div>

          <div
            className="absolute bottom-4 left-4 right-4 z-10 flex max-w-lg flex-col gap-3 sm:right-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-semibold text-white">{productName}</h3>
              {locale !== 'ar' && product.name_ar && (
                <p className="text-sm text-white/70" dir="rtl">
                  {product.name_ar}
                </p>
              )}
              {locale === 'ar' && product.name_en && (
                <p className="text-sm text-white/70" dir="ltr">
                  {product.name_en}
                </p>
              )}
            </div>
            {product.is_available && (
              <Button type="button" onClick={handleAddToCart} className="h-11 w-full sm:w-auto">
                <ShoppingCart className="mr-2 h-4 w-4" />
                {tCart('addToCart')}
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
