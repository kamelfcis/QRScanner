'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/shared/Image';
import { useSearchProducts } from '@/hooks/useProducts';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/components/providers/RootI18nProvider';
import { cn, getName } from '@/lib/utils';
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
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>('warda-recent-searches', []);
  const { data: results } = useSearchProducts(query);
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
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

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (value.length >= 2 && !recentSearches.includes(value)) {
      setRecentSearches((prev) => [value, ...prev].slice(0, 5));
    }
  }, [recentSearches, setRecentSearches]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-background"
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 py-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search menu..."
                  className="pl-10"
                  aria-label="Search menu items"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mt-4 max-h-[70vh] overflow-y-auto">
              {query.length < 2 && recentSearches.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                    Recent Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleSearch(term)}
                        className="rounded-full border px-3 py-1 text-sm transition-colors hover:bg-muted"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results && results.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {results.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        onSelectProduct(product);
                        onClose();
                      }}
                      className="overflow-hidden rounded-lg border text-left transition-shadow hover:shadow-md"
                    >
                      {product.image_url && (
                        <div className="relative aspect-square w-full overflow-hidden">
                          <Image
                            src={product.image_url}
                            alt={product.name_en}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, 25vw"
                          />
                        </div>
                      )}
                      <div className="p-2">
                        <h4 className="line-clamp-1 text-sm font-medium">
                          {getName(locale, product.name_en, product.name_ar)}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {product.dining_price} SAR
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {query.length >= 2 && results && results.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">No results found for &ldquo;{query}&rdquo;</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
