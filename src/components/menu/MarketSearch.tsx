'use client';

import { useEffect, useRef, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';

interface MarketSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const MAX_RECENT = 6;

/** First-class inline product search — the catalog's primary entry point. */
export function MarketSearch({ value, onChange, className }: MarketSearchProps) {
  const t = useTranslations('menu');
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useLocalStorage<string[]>('harameen-recent-searches', []);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const term = value.trim();
    if (term.length < 2) return;

    const timer = window.setTimeout(() => {
      setRecent((prev) => [term, ...prev.filter((item) => item !== term)].slice(0, MAX_RECENT));
    }, 900);

    return () => window.clearTimeout(timer);
  }, [value, setRecent]);

  const showRecent = focused && value.trim().length === 0 && recent.length > 0;

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'flex h-11 items-center gap-2 rounded-[var(--hm-radius)] border bg-[var(--hm-surface)] px-3 transition-colors',
          focused
            ? 'border-[var(--hm-primary)] shadow-[0_0_0_3px_var(--hm-primary-wash)]'
            : 'border-[var(--hm-line-strong)]'
        )}
      >
        <SearchIcon
          className="h-4.5 w-4.5 shrink-0 text-[var(--hm-ink-faint)]"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onChange('');
              inputRef.current?.blur();
            }
          }}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchProducts')}
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--hm-ink)] outline-none placeholder:text-[var(--hm-ink-faint)] [&::-webkit-search-cancel-button]:hidden"
          data-testid="market-search"
        />
        {value.length > 0 && (
          <motion.button
            type="button"
            whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="-me-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--hm-ink-soft)] transition-colors hover:bg-[var(--hm-surface-muted)]"
            aria-label={t('clearSearch')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </motion.button>
        )}
      </div>

      {showRecent && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 rounded-[var(--hm-radius)] border border-[var(--hm-line)] bg-[var(--hm-surface)] p-3 shadow-[var(--hm-shadow-raised)]">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--hm-ink-faint)]">
            {t('recentSearches')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((term) => (
              <button
                key={term}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChange(term)}
                className="rounded-full border border-[var(--hm-line)] bg-[var(--hm-surface-muted)] px-3 py-1.5 text-xs text-[var(--hm-ink)] transition-colors hover:border-[var(--hm-primary)] hover:text-[var(--hm-primary)]"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
