'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search as SearchIcon } from 'lucide-react';
import { Image } from '@/components/shared/Image';
import { useSearchProducts } from '@/hooks/useProducts';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { trackSearch } from '@/lib/analytics';
import type { Product } from '@/types/database';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export function SearchOverlay({ isOpen, onClose, onSelectProduct }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>(
    'aklet-recent-searches',
    []
  );
  const { data: results } = useSearchProducts(query);
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const { data: settings } = useRestaurantSettings();
  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (query.length >= 2 && results !== undefined) {
      trackSearch(query, results.length);
    }
  }, [query, results]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.length >= 2 && !recentSearches.includes(value)) {
        setRecentSearches((prev) => [value, ...prev].slice(0, 5));
      }
    },
    [recentSearches, setRecentSearches]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          data-aklet-theme
          initial={prefersReducedMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="bg-aklet-paper fixed inset-0 z-50 overflow-y-auto pt-[env(safe-area-inset-top)]"
          role="dialog"
          aria-modal="true"
          aria-label={t('searchMenuItems')}
        >
          <div className="mx-auto max-w-3xl px-3 pb-10 sm:px-5">
            <div className="bg-aklet-paper sticky top-0 z-10 flex items-center gap-2 py-3">
              <div className="relative flex-1">
                <SearchIcon
                  className="text-aklet-ink-soft pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="border-aklet-line/80 bg-aklet-paper-soft text-aklet-ink placeholder:text-aklet-ink-soft/70 focus-visible:border-aklet-ocean h-12 w-full rounded-xl border pe-10 ps-10 text-sm outline-none"
                  aria-label={t('searchMenuItems')}
                  autoComplete="off"
                />
                {query.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label={t('clearSearch')}
                    className="text-aklet-ink-soft hover:text-aklet-ink absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('closeSearch')}
                className="text-aklet-ink-soft hover:text-aklet-ink hover:bg-aklet-sand/60 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {query.length < 2 && (
              <div className="mt-2 space-y-5">
                <p className="text-aklet-ink-soft text-sm">{t('searchHint')}</p>
                {recentSearches.length > 0 && (
                  <div>
                    <span className="aklet-kicker">{t('recentSearches')}</span>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {recentSearches.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => handleSearch(term)}
                          className="border-aklet-line/80 text-aklet-ink-soft hover:border-aklet-ink/40 hover:text-aklet-ink h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {results && results.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4">
                {results.map((product) => {
                  const name = getName(locale, product.name_en, product.name_ar);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        onSelectProduct(product);
                        onClose();
                      }}
                      className="border-aklet-line/70 bg-aklet-paper-soft group overflow-hidden rounded-xl border text-start"
                    >
                      <span className="bg-aklet-sand/50 relative block aspect-square w-full overflow-hidden">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                            sizes="(max-width: 640px) 50vw, 33vw"
                            containerClassName="absolute inset-0 h-full w-full"
                          />
                        ) : (
                          <span className="text-aklet-ink-soft/40 font-heading absolute inset-0 flex items-center justify-center text-2xl">
                            {name.charAt(0)}
                          </span>
                        )}
                      </span>
                      <span className="block p-2.5">
                        <span className="font-heading text-aklet-ink line-clamp-1 block text-[13px] font-bold">
                          {name}
                        </span>
                        <span
                          className="text-aklet-price mt-1 block text-[13px] font-bold tabular-nums"
                          dir="ltr"
                        >
                          {formatCurrencyAmount(product.dining_price, currency, {
                            locale: currencyLocale,
                          })}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {query.length >= 2 && results && results.length === 0 && (
              <div className="py-14 text-center">
                <p className="font-heading text-aklet-ink font-bold">
                  {t('noResultsFor', { query })}
                </p>
                <p className="text-aklet-ink-soft mt-1.5 text-sm">{t('noResultsHint')}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
