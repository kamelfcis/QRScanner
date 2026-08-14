'use client';

import NextImage from 'next/image';
import { Heart, MessageCircle, Search, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { DiningModeToggle } from '@/components/menu/DiningModeToggle';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCartStore } from '@/stores/cart-store';
import { cn, getName } from '@/lib/utils';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';

interface MenuHeaderProps {
  tableParam: string | null;
  diningMode: 'dining' | 'takeaway';
  onDiningModeChange: (mode: 'dining' | 'takeaway') => void;
  onSearchOpen: () => void;
  onCartOpen: () => void;
  favoriteCount: number;
}

const iconButton =
  'inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--menu-ink)] transition-colors hover:bg-[var(--menu-gold-wash)]';

export function MenuHeader({
  tableParam,
  diningMode,
  onDiningModeChange,
  onSearchOpen,
  onCartOpen,
  favoriteCount,
}: MenuHeaderProps) {
  const { data: settings } = useRestaurantSettings();
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const tCart = useTranslations('cart');
  const tCommon = useTranslations('common');
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  const name = getName(
    locale,
    settings?.name_en || tCommon('appName'),
    settings?.name_ar || tCommon('appName')
  );

  const whatsapp = settings?.whatsapp?.replace(/[^0-9]/g, '');
  const waiterMessage = tableParam
    ? encodeURIComponent(
        locale === 'ar'
          ? `مرحباً، أحتاج مساعدة في الطاولة رقم ${tableParam}`
          : `Hello, I need assistance at table ${tableParam}`
      )
    : '';

  return (
    <motion.header
      initial={prefersReducedMotion ? undefined : { y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="bg-background/92 sticky top-0 z-40 pt-[env(safe-area-inset-top)] backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:h-16 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {settings?.logo_url ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--menu-line-strong)] bg-[var(--menu-surface)] p-1 sm:h-10 sm:w-10">
              <NextImage
                src={settings.logo_url}
                alt=""
                width={40}
                height={40}
                className="h-full w-full object-contain"
              />
            </span>
          ) : null}

          <div className="min-w-0">
            <h1 className="font-heading truncate text-[15px] font-semibold leading-tight tracking-tight sm:text-lg">
              {name}
            </h1>
            <p className="menu-eyebrow truncate text-[var(--menu-ink-soft)]">
              {t('menuLead')}
              {tableParam ? ` · ${t('tableNumber', { number: tableParam })}` : ''}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
          <DiningModeToggle
            value={diningMode}
            onChange={onDiningModeChange}
            className="hidden sm:inline-flex"
          />

          <LanguageSwitcher
            variant="ghost"
            className="hidden rounded-full text-[var(--menu-ink-soft)] hover:text-[var(--menu-ink)] sm:inline-flex sm:h-9 sm:px-3"
          />

          {whatsapp && tableParam && (
            <a
              href={`https://wa.me/${whatsapp}?text=${waiterMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(iconButton, 'hidden sm:inline-flex')}
              aria-label={t('callWaiter')}
            >
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
            </a>
          )}

          {favoriteCount > 0 && (
            <span
              role="status"
              aria-label={t('favoritesCount', { count: favoriteCount })}
              className="hidden items-center gap-1.5 rounded-full border border-[var(--menu-line-strong)] px-2.5 py-1 text-xs tabular-nums text-[var(--menu-wine)] sm:inline-flex"
            >
              <Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              {favoriteCount}
            </span>
          )}

          <button
            type="button"
            className={iconButton}
            onClick={onSearchOpen}
            aria-label={t('searchMenu')}
          >
            <Search className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>

          <button
            type="button"
            className={cn(iconButton, 'relative')}
            onClick={onCartOpen}
            aria-label={tCart('cartCount', { count: cartCount })}
            data-testid="cart-button"
          >
            <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="sr-only" aria-live="polite">
              {tCart('cartCount', { count: cartCount })}
            </span>
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={prefersReducedMotion ? undefined : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--menu-wine)] px-1 text-[10px] font-semibold tabular-nums text-[#FDF7F0]"
                data-testid="cart-badge"
              >
                {cartCount > 99 ? '99+' : cartCount}
              </motion.span>
            )}
          </button>
        </div>
      </div>

      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--menu-gold-line)] to-transparent"
      />
    </motion.header>
  );
}
