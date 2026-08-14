'use client';

import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Image } from '@/components/shared/Image';
import { ProductBadges } from '@/components/menu/ProductBadges';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useCartStore } from '@/stores/cart-store';
import { trackAddToCart } from '@/lib/analytics';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import type { Product } from '@/types/database';

interface ProductStripProps {
  title: string;
  note?: string;
  products: Product[];
  diningMode: 'dining' | 'takeaway';
  onSelectProduct: (product: Product) => void;
}

/**
 * Horizontal discovery rail built from the existing catalogue — no fabricated
 * "featured" data. Rendered only on the unfiltered menu so it never duplicates
 * the grid a guest is already looking at.
 */
export function ProductStrip({
  title,
  note,
  products,
  diningMode,
  onSelectProduct,
}: ProductStripProps) {
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const tCart = useTranslations('cart');
  const { data: settings } = useRestaurantSettings();
  const addItem = useCartStore((s) => s.addItem);

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';

  if (products.length === 0) return null;

  const quickAdd = (product: Product) => {
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
  };

  return (
    <section className="mx-auto max-w-6xl px-3 py-4 sm:px-5">
      <div className="mb-3">
        <span aria-hidden className="bg-aklet-coral mb-2 block h-[3px] w-8 rounded-full" />
        <h2 className="font-heading text-aklet-ink text-base font-bold leading-tight sm:text-lg">
          {title}
        </h2>
        {note ? <p className="text-aklet-ink-soft mt-0.5 text-xs">{note}</p> : null}
      </div>

      <div className="scrollbar-none -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        {products.map((product) => {
          const name = getName(locale, product.name_en, product.name_ar);
          const price = diningMode === 'dining' ? product.dining_price : product.takeaway_price;

          return (
            <article
              key={product.id}
              className="border-aklet-line/70 bg-aklet-paper-soft group relative w-[142px] shrink-0 snap-start overflow-hidden rounded-xl border sm:w-[168px]"
            >
              <button
                type="button"
                onClick={() => onSelectProduct(product)}
                aria-label={name}
                className="bg-aklet-sand/50 relative block aspect-square w-full overflow-hidden"
              >
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={name}
                    fill
                    sizes="168px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    containerClassName="absolute inset-0 h-full w-full"
                  />
                ) : (
                  <span className="text-aklet-ink-soft/40 font-heading absolute inset-0 flex items-center justify-center text-2xl">
                    {name.charAt(0)}
                  </span>
                )}
                <span className="absolute start-1.5 top-1.5 flex gap-1">
                  <ProductBadges product={product} />
                </span>
              </button>

              <div className="p-2.5">
                <button
                  type="button"
                  onClick={() => onSelectProduct(product)}
                  className="block w-full text-start"
                >
                  <h3 className="font-heading text-aklet-ink line-clamp-1 text-[13px] font-bold">
                    {name}
                  </h3>
                </button>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="text-aklet-price text-[13px] font-bold tabular-nums" dir="ltr">
                    {formatCurrencyAmount(price, currency, { locale: currencyLocale })}
                  </p>
                  {product.is_available && (
                    <motion.button
                      type="button"
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
                      onClick={() => quickAdd(product)}
                      aria-label={tCart('addToCart')}
                      className="bg-aklet-coral-cta flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    </motion.button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
