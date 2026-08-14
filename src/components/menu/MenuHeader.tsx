'use client';

import { Search, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { Image } from '@/components/shared/Image';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useClientMounted } from '@/hooks/useClientMounted';
import { useCartStore } from '@/stores/cart-store';
import { getName } from '@/lib/utils';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';

interface MenuHeaderProps {
  tableParam: string | null;
  onSearchOpen: () => void;
  onCartOpen: () => void;
}

/**
 * Compact sticky bar: identity on one side, the two actions guests actually
 * reach for on the other. Everything else lives in the utility row below so
 * the chrome stays 56px tall on a 320px phone.
 */
export function MenuHeader({ tableParam, onSearchOpen, onCartOpen }: MenuHeaderProps) {
  const { data: settings } = useRestaurantSettings();
  const prefersReducedMotion = useReducedMotion();
  const mounted = useClientMounted();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const tCart = useTranslations('cart');
  const tCommon = useTranslations('common');
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  // Cart lives in localStorage — only trust the count after the client mounts.
  const badgeCount = mounted ? cartCount : 0;

  const name = getName(
    locale,
    settings?.name_en || tCommon('appName'),
    settings?.name_ar || tCommon('appName')
  );

  return (
    <header className="bg-aklet-paper/92 border-aklet-line/70 sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-[var(--aklet-header-h)] max-w-6xl items-center gap-2 px-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {settings?.logo_url ? (
            <Image
              src={settings.logo_url}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              containerClassName="bg-aklet-sand/60 h-9 w-9 shrink-0 rounded-md"
            />
          ) : null}
          <span className="min-w-0">
            <span className="font-heading text-aklet-ink block truncate text-[15px] font-bold leading-tight sm:text-lg">
              {name}
            </span>
            {tableParam ? (
              <span className="text-aklet-ink-soft block truncate text-[11px] leading-tight">
                {t('tableNumber', { number: tableParam })}
              </span>
            ) : null}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onSearchOpen}
            aria-label={t('searchMenu')}
            className="text-aklet-ink-soft hover:text-aklet-ink hover:bg-aklet-sand/60 flex h-10 w-10 items-center justify-center rounded-full transition-colors"
          >
            <Search className="h-[18px] w-[18px]" aria-hidden />
          </button>

          <button
            type="button"
            onClick={onCartOpen}
            aria-label={tCart('cartCount', { count: badgeCount })}
            data-testid="cart-button"
            className="text-aklet-ink hover:bg-aklet-sand/60 relative flex h-10 w-10 items-center justify-center rounded-full transition-colors"
          >
            <ShoppingBag className="h-[18px] w-[18px]" aria-hidden />
            <span className="sr-only" aria-live="polite">
              {tCart('cartCount', { count: badgeCount })}
            </span>
            {badgeCount > 0 && (
              <motion.span
                key={badgeCount}
                initial={prefersReducedMotion ? undefined : { scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-aklet-coral-cta absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums text-white"
                data-testid="cart-badge"
              >
                {badgeCount > 99 ? '99+' : badgeCount}
              </motion.span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
