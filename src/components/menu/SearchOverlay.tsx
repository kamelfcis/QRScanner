'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Image } from '@/components/shared/Image';
import { useSearchProducts } from '@/hooks/useProducts';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import {
  formatCurrencyAmount,
  getRestaurantCurrency,
  toCurrencyLocale,
} from '@/lib/order/format-currency';
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
    'warda-recent-searches',
    []
  );
  const { data: results } = useSearchProducts(query);
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const tCommon = useTranslations('accessibility');
  const { data: settings } = useRestaurantSettings();
  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = toCurrencyLocale(locale);

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
          role="dialog"
          aria-modal="true"
          aria-label={t('searchMenuItems')}
          initial={prefersReducedMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex flex-col bg-[var(--menu-paper)] pt-[env(safe-area-inset-top)]"
        >
          <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 sm:px-6">
            <div className="flex items-center gap-2 py-3">
              <div className="relative flex-1">
                <SearchIcon
                  className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--menu-ink-soft)]"
                  aria-hidden="true"
                />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="h-12 rounded-full border-[var(--menu-line-strong)] bg-[var(--menu-surface)] pe-4 ps-10 text-sm"
                  aria-label={t('searchMenuItems')}
                />
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('closeSearch')}
                title={tCommon('close')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--menu-ink-soft)] transition-colors hover:bg-[var(--menu-gold-wash)] hover:text-[var(--menu-ink)]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
              {query.length < 2 && (
                <div className="pt-2">
                  {recentSearches.length > 0 ? (
                    <>
                      <h3 className="menu-eyebrow mb-2 text-[var(--menu-ink-soft)]">
                        {t('recentSearches')}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => handleSearch(term)}
                            className="rounded-full border border-[var(--menu-line-strong)] bg-[var(--menu-surface)] px-3.5 py-2 text-sm text-[var(--menu-ink)] transition-colors hover:border-[var(--menu-gold-soft)]"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="pt-8 text-center text-sm text-[var(--menu-ink-soft)]">
                      {t('searchHint')}
                    </p>
                  )}
                </div>
              )}

              {results && results.length > 0 && (
                <ul className="divide-y divide-[var(--menu-line)]">
                  {results.map((product) => {
                    const name = getName(
                      locale,
                      product.name_en,
                      product.name_ar,
                      product.name_fr,
                      product.name_nl
                    );
                    return (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProduct(product);
                            onClose();
                          }}
                          className="flex w-full items-center gap-3 py-3 text-start transition-colors hover:bg-[var(--menu-gold-wash)]"
                        >
                          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--menu-paper-deep)]">
                            {product.image_url ? (
                              <Image
                                src={product.image_url}
                                alt={name}
                                fill
                                className="object-cover"
                                sizes="56px"
                                containerClassName="absolute inset-0"
                              />
                            ) : (
                              <span className="font-heading flex h-full items-center justify-center text-lg text-[var(--menu-gold-faint)]">
                                {name.charAt(0)}
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="font-heading block truncate text-sm font-semibold text-[var(--menu-ink)]">
                              {name}
                            </span>
                            <span
                              className="mt-0.5 block text-sm tabular-nums text-[var(--menu-wine)]"
                              dir="ltr"
                            >
                              {product.has_size_options ? (
                                product.dining_price !== product.takeaway_price ? (
                                  <>
                                    {formatCurrencyAmount(
                                      Math.min(product.dining_price, product.takeaway_price),
                                      currency,
                                      { locale: currencyLocale }
                                    )}{' '}
                                    –{' '}
                                    {formatCurrencyAmount(
                                      Math.max(product.dining_price, product.takeaway_price),
                                      currency,
                                      { locale: currencyLocale }
                                    )}
                                  </>
                                ) : (
                                  formatCurrencyAmount(product.dining_price, currency, {
                                    locale: currencyLocale,
                                  })
                                )
                              ) : (
                                formatCurrencyAmount(product.dining_price, currency, {
                                  locale: currencyLocale,
                                })
                              )}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {query.length >= 2 && results && results.length === 0 && (
                <div className="px-6 py-14 text-center">
                  <p className="font-heading text-base font-semibold text-[var(--menu-ink)]">
                    {t('noResultsFor', { query })}
                  </p>
                  <p className="mx-auto mt-2 max-w-[36ch] text-sm text-[var(--menu-ink-soft)]">
                    {t('noResultsHint')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
