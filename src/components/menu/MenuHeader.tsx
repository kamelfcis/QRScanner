'use client';

import NextImage from 'next/image';
import { Utensils, ShoppingBag, Heart, Search, MessageCircle, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      initial={prefersReducedMotion ? undefined : { y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'bg-background/95 border-border/60 dark:border-border/40 sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] backdrop-blur'
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {settings?.logo_url ? (
            <NextImage
              src={settings.logo_url}
              alt={name}
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 object-contain"
            />
          ) : null}
          <h1 className="font-heading text-primary truncate text-lg font-bold sm:text-xl">
            {name}
          </h1>
          {tableParam && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {t('tableNumber', { number: tableParam })}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {whatsapp && tableParam && (
            <a
              href={`https://wa.me/${whatsapp}?text=${waiterMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-muted inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#25D366]"
              aria-label={t('callWaiter')}
            >
              <MessageCircle className="h-5 w-5" />
            </a>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            className="h-11 w-11"
            onClick={onSearchOpen}
            aria-label={t('searchMenu')}
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="relative h-11 w-11"
            aria-label={t('favoritesCount', { count: favoriteCount })}
          >
            <Heart className="h-5 w-5" />
            {favoriteCount > 0 && (
              <span className="bg-primary text-primary-foreground absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold">
                {favoriteCount}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="relative h-11 w-11"
            onClick={onCartOpen}
            aria-label={tCart('cartCount', { count: cartCount })}
            data-testid="cart-button"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="sr-only" aria-live="polite">
              {tCart('cartCount', { count: cartCount })}
            </span>
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={prefersReducedMotion ? undefined : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-primary text-primary-foreground absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] font-bold tabular-nums"
                data-testid="cart-badge"
              >
                {cartCount > 99 ? '99+' : cartCount}
              </motion.span>
            )}
          </Button>

          <div
            className="flex items-center rounded-lg border"
            role="group"
            aria-label={t('diningMode')}
          >
            <Button
              variant={diningMode === 'dining' ? 'default' : 'ghost'}
              size="icon-sm"
              className="h-11 w-11 rounded-r-none"
              onClick={() => onDiningModeChange('dining')}
              aria-pressed={diningMode === 'dining'}
              aria-label={t('dining')}
            >
              <Utensils className="h-4 w-4" />
            </Button>
            <Button
              variant={diningMode === 'takeaway' ? 'default' : 'ghost'}
              size="icon-sm"
              className="h-11 w-11 rounded-l-none"
              onClick={() => onDiningModeChange('takeaway')}
              aria-pressed={diningMode === 'takeaway'}
              aria-label={t('takeaway')}
            >
              <ShoppingBag className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
