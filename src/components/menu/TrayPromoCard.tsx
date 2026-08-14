'use client';

import { Image } from '@/components/shared/Image';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import type { Product } from '@/types/database';

interface TrayPromoCardProps {
  product: Product;
  diningMode: 'dining' | 'takeaway';
  onSelectProduct: (product: Product) => void;
}

/**
 * The saver tray is a paragraph of promotional copy in the catalogue, so it
 * gets a promo card instead of a square tile: one teaser line here, the whole
 * offer in the product sheet.
 */
export function TrayPromoCard({ product, diningMode, onSelectProduct }: TrayPromoCardProps) {
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const { data: settings } = useRestaurantSettings();

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';
  const name = getName(locale, product.name_en, product.name_ar);
  const description = getName(locale, product.description_en || '', product.description_ar || '');
  const price = diningMode === 'dining' ? product.dining_price : product.takeaway_price;

  return (
    <section className="mx-auto max-w-6xl px-3 pb-1 pt-4 sm:px-5">
      <button
        type="button"
        onClick={() => onSelectProduct(product)}
        className="bg-aklet-grill group relative flex w-full overflow-hidden rounded-2xl text-start"
      >
        <div className="relative w-[38%] shrink-0 sm:w-[30%]">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt=""
              fill
              sizes="(max-width: 640px) 40vw, 320px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              containerClassName="absolute inset-0 h-full w-full"
              showFallback={false}
            />
          ) : null}
          <span
            aria-hidden
            className="from-aklet-grill absolute inset-0 bg-gradient-to-l to-transparent rtl:bg-gradient-to-r"
          />
        </div>

        <div className="min-w-0 flex-1 p-3.5 sm:p-5">
          <span className="bg-aklet-coral/15 text-aklet-coral inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ltr:tracking-[0.12em]">
            {t('offerLabel')}
          </span>
          <h3 className="font-heading mt-2 text-base font-bold leading-snug text-white sm:text-xl">
            {name}
          </h3>
          <p className="mt-1 text-[11px] text-white/60 sm:text-xs">{t('sharedTray')}</p>
          {description ? (
            <p className="mt-1.5 line-clamp-1 text-xs text-white/75 sm:text-sm">{description}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className="text-aklet-coral text-base font-bold tabular-nums sm:text-lg"
              dir="ltr"
            >
              {formatCurrencyAmount(price, currency, { locale: currencyLocale })}
            </span>
            <span className="text-[11px] font-semibold text-white/80 underline-offset-4 group-hover:underline sm:text-xs">
              {t('viewOffer')}
            </span>
          </div>
        </div>
      </button>
    </section>
  );
}
