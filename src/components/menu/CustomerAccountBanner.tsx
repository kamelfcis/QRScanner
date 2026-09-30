'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift } from 'lucide-react';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { isAlaKeefakTenant } from '@/i18n/config';
import { getName } from '@/lib/utils';

interface NotificationRow {
  id: string;
  notification_type: string;
  title_en: string | null;
  title_ar: string | null;
  body_en: string | null;
  body_ar: string | null;
  read_at: string | null;
}

interface OfferRow {
  id: string;
  title_en: string;
  title_ar: string;
}

export function CustomerAccountBanner() {
  const { locale } = useI18n();
  const t = useTranslations('account');
  const [banner, setBanner] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    if (!isAlaKeefakTenant) return;

    void (async () => {
      const accRes = await fetch('/api/customer/account');
      if (!accRes.ok) return;

      const [notifRes, offersRes] = await Promise.all([
        fetch('/api/customer/notifications'),
        fetch('/api/customer/offers'),
      ]);

      if (notifRes.ok) {
        const notifications = (await notifRes.json()) as NotificationRow[];
        const unread = notifications.find((n) => !n.read_at);
        if (unread) {
          setBanner({
            title:
              getName(locale, unread.title_en ?? '', unread.title_ar ?? '') || t('notifications'),
            body: getName(locale, unread.body_en ?? '', unread.body_ar ?? ''),
          });
          return;
        }
      }

      if (offersRes.ok) {
        const offers = (await offersRes.json()) as OfferRow[];
        const offer = offers[0];
        if (offer) {
          setBanner({
            title: getName(locale, offer.title_en, offer.title_ar),
            body: t('yourOffers'),
          });
        }
      }
    })();
  }, [locale, t]);

  if (!isAlaKeefakTenant || !banner) return null;

  return (
    <Link
      href="/account"
      className="border-[var(--ak-ember,#d97706)]/25 hover:bg-[var(--ak-gold-wash,#faf8f5)]/80 mx-auto flex max-w-6xl items-start gap-3 rounded-xl border bg-[var(--ak-gold-wash,#faf8f5)] px-4 py-3 text-sm text-[var(--menu-ink)] transition-colors"
    >
      <Gift className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ak-ember,#d97706)]" aria-hidden />
      <span className="min-w-0">
        <span className="block font-medium">{banner.title}</span>
        {banner.body ? (
          <span className="text-muted-foreground mt-0.5 block truncate">{banner.body}</span>
        ) : null}
      </span>
    </Link>
  );
}
