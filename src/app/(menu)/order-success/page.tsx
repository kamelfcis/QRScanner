'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, ClipboardList, MessageCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { MenuThemeScope } from '@/components/menu/MenuThemeScope';
import { useCartStore } from '@/stores/cart-store';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fadeInUp, successSpringIn } from '@/lib/motion';
import { openWhatsAppUrl, WHATSAPP_POPUP_BLOCKED_KEY } from '@/lib/order/build-order';
import {
  buildOrderStatusPath,
  cartLinesToLastOrderItems,
  readLastOrder,
  writeLastOrder,
} from '@/lib/order/last-order';
import { cn } from '@/lib/utils';
import { hasHettSamakaTier3 } from '@/i18n/config';
import {
  estimateReadyTime,
  formatReadyTimeRange,
  type PrepFulfillmentType,
} from '@/lib/order/estimate-ready-time';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n } from '@/components/providers/RootI18nProvider';

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100svh] items-center justify-center">
          <div className="bg-muted h-8 w-48 animate-pulse rounded" />
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}

function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sent = searchParams.get('sent') === '1';
  const orderNumber = searchParams.get('order');
  const itemCountParam = Number(searchParams.get('items') ?? '0');
  const fulfillmentParam = searchParams.get('fulfillment') as PrepFulfillmentType | 'dining' | null;
  const t = useTranslations('orderSuccess');
  const { locale } = useI18n();
  const { data: settings } = useRestaurantSettings();
  const prefersReducedMotion = useReducedMotion();
  const clear = useCartStore((s) => s.clear);
  const cartItems = useCartStore((s) => s.items);
  const diningMode = useCartStore((s) => s.diningMode);
  const fulfillmentType = useCartStore((s) => s.fulfillmentType);
  const [returned, setReturned] = useState(false);
  const [waUrl] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem('warda-last-wa-url');
    } catch {
      return null;
    }
  });
  const [waBlocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(WHATSAPP_POPUP_BLOCKED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!hasHettSamakaTier3 || cartItems.length === 0) return;
    const existing = readLastOrder();
    if (existing?.items?.length) return;
    writeLastOrder({
      ...(existing ?? {
        orderNumber: orderNumber ?? `SNAP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        status: 'new' as const,
        placedAt: new Date().toISOString(),
      }),
      items: cartLinesToLastOrderItems(cartItems),
      diningMode,
      fulfillmentType: diningMode === 'takeaway' ? fulfillmentType : null,
    });
  }, [cartItems, diningMode, fulfillmentType, orderNumber]);

  const readyEstimate = useMemo(() => {
    if (!hasHettSamakaTier3) return null;
    const itemCount =
      itemCountParam > 0 ? itemCountParam : cartItems.reduce((n, i) => n + i.quantity, 0);
    if (itemCount <= 0) return null;
    const fulfillment: PrepFulfillmentType =
      fulfillmentParam === 'delivery' ||
      fulfillmentParam === 'pickup' ||
      fulfillmentParam === 'dining'
        ? fulfillmentParam
        : diningMode === 'takeaway'
          ? fulfillmentType
          : 'dining';
    return estimateReadyTime({
      itemCount,
      fulfillmentType: fulfillment,
      basePrepMinutes: settings?.prep_time_minutes,
    });
  }, [
    itemCountParam,
    cartItems,
    fulfillmentParam,
    diningMode,
    fulfillmentType,
    settings?.prep_time_minutes,
  ]);

  useEffect(() => {
    if (!sent) return;

    const onFocus = () => setReturned(true);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') setReturned(true);
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const timer = window.setTimeout(() => setReturned(true), 4000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(timer);
    };
  }, [sent]);

  const showThankYou = !sent || returned;
  const title = showThankYou
    ? orderNumber
      ? t('placedTitle')
      : t('thankYouTitle')
    : t('readyTitle');
  const description = showThankYou
    ? orderNumber
      ? t('placedDescription', { number: orderNumber })
      : t('thankYouDescription')
    : t('readyDescription');

  const keepCart = () => {
    router.push('/menu');
  };

  const clearCart = () => {
    clear();
    try {
      sessionStorage.removeItem('warda-last-wa-url');
      sessionStorage.removeItem(WHATSAPP_POPUP_BLOCKED_KEY);
    } catch {
      // ignore
    }
    router.push('/menu');
  };

  return (
    <div
      data-menu-theme
      className="flex min-h-[100svh] items-center justify-center bg-[var(--menu-paper)] px-4 pb-[env(safe-area-inset-bottom)]"
    >
      <MenuThemeScope />
      <motion.div
        initial={prefersReducedMotion ? undefined : 'hidden'}
        animate="visible"
        variants={fadeInUp}
        className="w-full max-w-md space-y-6 text-center"
      >
        <motion.div
          variants={prefersReducedMotion ? undefined : scaleIn}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--menu-line-strong)] bg-[var(--menu-surface)] text-[var(--menu-wine)] ring-4 ring-[var(--menu-gold-wash)]"
        >
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{title}</h1>
          {orderNumber ? (
            <p className="font-heading text-xl font-semibold tabular-nums text-[var(--menu-wine)]">
              {orderNumber}
            </p>
          ) : null}
          <p className="mx-auto max-w-[38ch] text-sm leading-relaxed text-[var(--menu-ink-soft)]">
            {description}
          </p>
          {waBlocked && waUrl ? (
            <p className="mx-auto max-w-[38ch] text-sm leading-relaxed text-[var(--menu-ink-soft)]">
              {t('readyDescription')}
            </p>
          ) : null}
          {readyEstimate ? (
            <p
              className="mx-auto max-w-[38ch] rounded-full border border-[var(--menu-line)] bg-[var(--menu-surface)] px-4 py-2 text-sm font-medium text-[var(--menu-wine)]"
              data-testid="ready-time-estimate"
            >
              {t('readyEstimate', {
                range: formatReadyTimeRange(readyEstimate, locale),
              })}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          {waUrl && waBlocked ? (
            <Button
              size="lg"
              className="h-12 min-h-11 w-full rounded-full bg-[var(--menu-wine)] text-[#FDF7F0] hover:bg-[var(--menu-wine-deep)]"
              onClick={() => openWhatsAppUrl(waUrl, { navigateOnBlock: false })}
              data-testid="reopen-whatsapp"
            >
              <MessageCircle className="me-2 h-4 w-4" aria-hidden="true" />
              {t('openWhatsAppNow')}
            </Button>
          ) : null}
          {orderNumber ? (
            <Link
              href={buildOrderStatusPath(orderNumber)}
              className={cn(
                buttonVariants(),
                'h-12 w-full rounded-full bg-[var(--menu-wine)] text-[#FDF7F0] hover:bg-[var(--menu-wine-deep)]'
              )}
              data-testid="check-order-status"
            >
              <ClipboardList className="me-2 h-4 w-4" aria-hidden="true" />
              {t('checkStatus')}
            </Link>
          ) : null}
          {orderNumber ? (
            <p className="text-center text-xs leading-relaxed text-[var(--menu-ink-soft)]">
              {t('saveLinkHint')}
            </p>
          ) : null}
          {waUrl && !waBlocked && (
            <Button
              size="lg"
              variant={orderNumber ? 'outline' : 'default'}
              className={cn(
                'h-12 w-full rounded-full',
                !orderNumber &&
                  'bg-[var(--menu-wine)] text-[#FDF7F0] hover:bg-[var(--menu-wine-deep)]'
              )}
              onClick={() => openWhatsAppUrl(waUrl, { navigateOnBlock: false })}
              data-testid="reopen-whatsapp"
            >
              <MessageCircle className="me-2 h-4 w-4" aria-hidden="true" />
              {t('openWhatsApp')}
            </Button>
          )}

          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full rounded-full"
            onClick={keepCart}
            data-testid="keep-cart"
          >
            {t('keepCart')}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full rounded-full text-[var(--menu-ink-soft)]"
            onClick={clearCart}
            data-testid="clear-cart"
          >
            {t('clearCart')}
          </Button>

          <Link href="/menu" className={buttonVariants({ variant: 'link' })}>
            {t('backToMenu')}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
