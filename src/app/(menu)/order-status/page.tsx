'use client';

import { FormEvent, Suspense, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clipboard, ClipboardCheck, MessageCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { MenuThemeScope } from '@/components/menu/MenuThemeScope';
import { OrderStatusTicket } from '@/components/order/OrderStatusTicket';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useClientMounted } from '@/hooks/useClientMounted';
import { useDetectedDialCode } from '@/hooks/useDetectedDialCode';
import { fadeInUp } from '@/lib/motion';
import { openWhatsAppUrl } from '@/lib/order/build-order';
import { useLiveOrderStatus } from '@/hooks/useLiveOrderStatus';
import {
  buildOrderStatusPath,
  matchLastOrder,
  normalizeOrderQuery,
  readLastOrder,
  writeLastOrder,
  type LastOrderSnapshot,
} from '@/lib/order/last-order';
import {
  canFetchLiveStatus,
  fetchLiveOrderStatus,
  mergeLiveStatus,
  type LiveOrderStatus,
} from '@/lib/order/live-status';
import { normalizeLocalPhone } from '@/lib/phone/normalize';
import { cn } from '@/lib/utils';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.left = '-9999px';
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(field);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function OrderStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100svh] items-center justify-center">
          <div className="bg-muted h-8 w-48 animate-pulse rounded" />
        </div>
      }
    >
      <OrderStatusContent />
    </Suspense>
  );
}

function OrderStatusContent() {
  const searchParams = useSearchParams();
  const queryOrder = normalizeOrderQuery(searchParams.get('order'));
  const { locale } = useI18n();
  const t = useTranslations('orderStatus');
  const prefersReducedMotion = useReducedMotion();
  const mounted = useClientMounted();
  const detectedDial = useDetectedDialCode(locale);
  const [, setTicketRev] = useState(0);
  const snapshot = mounted ? readLastOrder() : null;
  const [lookedUpNumber, setLookedUpNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [typedNumber, setTypedNumber] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupPending, setLookupPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [waUrl] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem('warda-last-wa-url');
    } catch {
      return null;
    }
  });

  const orderNumber = typedNumber ?? queryOrder;
  const viewedNumber = lookedUpNumber || queryOrder;

  const matched = useMemo(() => {
    if (!snapshot) return false;
    if (viewedNumber) return matchLastOrder(snapshot, { orderNumber: viewedNumber });
    return true;
  }, [snapshot, viewedNumber]);

  const ticketNumber = viewedNumber || (matched ? (snapshot?.orderNumber ?? '') : '');
  const livePhone = matched && snapshot?.phone ? snapshot.phone : null;
  const persistLive = useCallback((next: LiveOrderStatus) => {
    const current = readLastOrder();
    if (
      !current ||
      normalizeOrderQuery(current.orderNumber) !== normalizeOrderQuery(next.orderNumber)
    ) {
      return;
    }
    if (
      current.status === next.status &&
      current.diningMode === (next.diningMode ?? current.diningMode)
    ) {
      return;
    }
    writeLastOrder(mergeLiveStatus(current, next));
    setTicketRev((value) => value + 1);
  }, []);
  const live = useLiveOrderStatus(ticketNumber, livePhone, detectedDial.country, persistLive);
  const displaySnapshot = useMemo(() => {
    if (
      live &&
      ticketNumber &&
      normalizeOrderQuery(live.orderNumber) === normalizeOrderQuery(ticketNumber)
    ) {
      return mergeLiveStatus(matched ? snapshot : null, live);
    }
    return matched ? snapshot : null;
  }, [live, matched, snapshot, ticketNumber]);
  const showTicket = Boolean(ticketNumber);
  const confirmationOnly = showTicket && !matched && !live;

  const statusHref = buildOrderStatusPath(ticketNumber || snapshot?.orderNumber);

  const applyTicket = (nextSnapshot: LastOrderSnapshot) => {
    writeLastOrder(nextSnapshot);
    setTicketRev((value) => value + 1);
    const next = buildOrderStatusPath(nextSnapshot.orderNumber);
    window.history.replaceState(null, '', next);
    setTypedNumber(nextSnapshot.orderNumber);
    setLookedUpNumber(nextSnapshot.orderNumber);
  };

  const handleLookup = async (event: FormEvent) => {
    event.preventDefault();
    setLookupError(null);
    const typedOrderNumber = normalizeOrderQuery(orderNumber);
    const typedPhone = phone.trim();
    if (!typedOrderNumber && !typedPhone) {
      setLookupError(t('notFound'));
      return;
    }

    const normalizedPhone = typedPhone ? normalizeLocalPhone(typedPhone, detectedDial.country) : '';
    const lookupPhone = typedPhone ? normalizedPhone || typedPhone : undefined;

    if (canFetchLiveStatus(typedOrderNumber, lookupPhone)) {
      setLookupPending(true);
      try {
        const remote = await fetchLiveOrderStatus(
          typedOrderNumber,
          lookupPhone as string,
          detectedDial.country
        );
        if (remote) {
          applyTicket(mergeLiveStatus(snapshot, remote, lookupPhone));
          return;
        }
      } finally {
        setLookupPending(false);
      }
    }

    const found = matchLastOrder(snapshot, {
      orderNumber: typedOrderNumber || undefined,
      phone: lookupPhone,
    });

    if (!found || !snapshot) {
      setLookupError(t('notFound'));
      return;
    }

    applyTicket(snapshot);
  };

  const handleCopy = async () => {
    const url =
      typeof window === 'undefined' ? statusHref : `${window.location.origin}${statusHref}`;
    const ok = await copyText(url);
    setCopied(ok);
    setCopyFailed(!ok);
  };

  return (
    <div
      data-menu-theme
      className="min-h-[100svh] bg-[var(--menu-paper)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4"
    >
      <MenuThemeScope />
      <motion.div
        initial={prefersReducedMotion ? undefined : 'hidden'}
        animate="visible"
        variants={fadeInUp}
        className="mx-auto w-full max-w-md space-y-6"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/menu"
            aria-label={t('backToMenu')}
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'h-11 w-11')}
          >
            <ArrowLeft className={cn('h-5 w-5', locale === 'ar' && 'rotate-180')} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="menu-eyebrow text-[var(--menu-ink-soft)]">{t('eyebrow')}</p>
            <h1 className="font-heading truncate text-xl font-semibold">{t('title')}</h1>
          </div>
          <LanguageSwitcher
            variant="ghost"
            className="size-11 shrink-0 rounded-full text-[var(--menu-ink-soft)] hover:text-[var(--menu-ink)]"
          />
        </div>

        <p className="text-sm leading-relaxed text-[var(--menu-ink-soft)]">{t('lead')}</p>

        {showTicket ? (
          <OrderStatusTicket
            orderNumber={ticketNumber}
            snapshot={displaySnapshot}
            confirmationOnly={confirmationOnly}
            isLive={Boolean(live)}
          />
        ) : (
          <div className="rounded-2xl border border-[var(--menu-line)] bg-[var(--menu-surface)] px-5 py-6 text-center">
            <p className="text-sm leading-relaxed text-[var(--menu-ink-soft)]">{t('noTicket')}</p>
          </div>
        )}

        {showTicket ? (
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full rounded-full bg-[var(--menu-wine)] text-[#FDF7F0] hover:bg-[var(--menu-wine-deep)]"
              onClick={handleCopy}
              data-testid="copy-order-status-link"
            >
              {copied ? (
                <ClipboardCheck className="me-2 h-4 w-4" aria-hidden="true" />
              ) : (
                <Clipboard className="me-2 h-4 w-4" aria-hidden="true" />
              )}
              {copied ? t('copied') : t('copyLink')}
            </Button>
            {copyFailed ? (
              <p role="status" className="text-center text-xs text-[var(--menu-ink-soft)]">
                {t('copyFailed')}
              </p>
            ) : (
              <p className="text-center text-xs text-[var(--menu-ink-soft)]">{t('saveLink')}</p>
            )}
            {waUrl ? (
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-12 w-full rounded-full"
                onClick={() => openWhatsAppUrl(waUrl)}
              >
                <MessageCircle className="me-2 h-4 w-4" aria-hidden="true" />
                {t('openWhatsApp')}
              </Button>
            ) : null}
          </div>
        ) : null}

        <form
          onSubmit={handleLookup}
          className="space-y-4 rounded-2xl border border-[var(--menu-line)] bg-[var(--menu-surface)] px-5 py-5"
        >
          <div className="space-y-1">
            <h2 className="font-heading text-base font-semibold">{t('lookupTitle')}</h2>
            <p className="text-sm leading-relaxed text-[var(--menu-ink-soft)]">{t('lookupLead')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-status-phone">{t('phoneLabel')}</Label>
            <div className="flex gap-2">
              <span
                className="bg-muted text-muted-foreground inline-flex min-h-11 shrink-0 items-center rounded-md border px-3 text-sm font-medium tabular-nums"
                aria-hidden="true"
              >
                {detectedDial.prefix}
              </span>
              <Input
                id="order-status-phone"
                name="tel-local"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                className="min-h-11 min-w-0 flex-1"
                value={phone}
                placeholder={t('phonePlaceholder')}
                onChange={(event) => setPhone(event.target.value.replace(/[^\d\s-]/g, ''))}
                data-testid="order-status-phone"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-status-number">{t('orderNumberLabel')}</Label>
            <Input
              id="order-status-number"
              name="order-number"
              className="min-h-11"
              value={orderNumber}
              placeholder={t('orderNumberPlaceholder')}
              onChange={(event) => setTypedNumber(event.target.value)}
              autoCapitalize="characters"
              data-testid="order-status-order-number"
            />
          </div>

          {lookupError ? (
            <p role="alert" className="text-destructive text-sm">
              {lookupError}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            variant="outline"
            className="h-12 w-full rounded-full"
            data-testid="order-status-lookup"
            disabled={lookupPending}
          >
            {t('lookup')}
          </Button>
        </form>

        <Link
          href="/menu"
          className={cn(buttonVariants({ variant: 'link' }), 'mx-auto block w-fit')}
        >
          {t('backToMenu')}
        </Link>
      </motion.div>
    </div>
  );
}
