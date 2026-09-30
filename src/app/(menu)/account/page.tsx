'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MenuThemeScope } from '@/components/menu/MenuThemeScope';
import { alaKeefakTenantAttr, isAlaKeefakTenant } from '@/i18n/config';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { formatDisplayPhone } from '@/lib/phone/normalize';
import { formatLocaleDate } from '@/lib/dateLocale';
import { clearCustomerSession } from '@/app/actions/customer-register';

interface CustomerAccount {
  id: string;
  first_name: string;
  display_name: string | null;
  points_balance: number;
  phone_normalized: string;
}

interface NotificationRow {
  id: string;
  notification_type: string;
  title_en: string | null;
  title_ar: string | null;
  body_en: string | null;
  body_ar: string | null;
  read_at: string | null;
  created_at: string;
}

interface OfferRow {
  id: string;
  title_en: string;
  title_ar: string;
  description_en: string | null;
  description_ar: string | null;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
}

export default function AccountPage() {
  const { locale } = useI18n();
  const t = useTranslations('account');
  const tCommon = useTranslations('common');
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const accRes = await fetch('/api/customer/account');
    if (!accRes.ok) {
      setAccount(null);
      setLoading(false);
      return;
    }
    const acc = (await accRes.json()) as CustomerAccount;
    setAccount(acc);
    setDisplayName(acc.display_name ?? acc.first_name);

    const [notifRes, offersRes] = await Promise.all([
      fetch('/api/customer/notifications'),
      fetch('/api/customer/offers'),
    ]);
    if (notifRes.ok) setNotifications((await notifRes.json()) as NotificationRow[]);
    if (offersRes.ok) setOffers((await offersRes.json()) as OfferRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAlaKeefakTenant) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial account fetch on mount
    void load();
  }, []);

  const saveName = async () => {
    const res = await fetch('/api/customer/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName }),
    });
    if (res.ok) toast.success(t('saved'));
    else toast.error(tCommon('error'));
  };

  const markRead = async (id: string) => {
    await fetch('/api/customer/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_id: id }),
    });
    void load();
  };

  const logout = async () => {
    await clearCustomerSession();
    setAccount(null);
  };

  if (!isAlaKeefakTenant) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p>{tCommon('noData')}</p>
      </div>
    );
  }

  return (
    <div {...alaKeefakTenantAttr} className="min-h-screen bg-[var(--menu-paper)] pb-16">
      <MenuThemeScope />
      <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
          <span className="ember-line mt-2 block w-12" aria-hidden />
        </div>

        {loading ? <p className="text-muted-foreground text-sm">{tCommon('loading')}</p> : null}

        {!loading && !account ? (
          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-sm">{t('notLoggedIn')}</p>
            <Link
              href="/checkout"
              className="bg-primary text-primary-foreground inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm"
            >
              {t('goCheckout')}
            </Link>
          </div>
        ) : null}

        {account ? (
          <>
            <section className="space-y-3 rounded-xl border p-4">
              <div>
                <Label htmlFor="display-name">{t('displayName')}</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <p className="text-muted-foreground text-sm">
                {t('phoneReadOnly')}:{' '}
                <span dir="ltr">{formatDisplayPhone(account.phone_normalized)}</span>
              </p>
              <p className="font-heading text-lg tabular-nums">
                {t('pointsBalance', { count: account.points_balance })}
              </p>
              <div className="flex gap-2">
                <Button type="button" onClick={() => void saveName()}>
                  {tCommon('save')}
                </Button>
                <Button type="button" variant="outline" onClick={() => void logout()}>
                  {t('signOut')}
                </Button>
              </div>
            </section>

            {offers.length > 0 ? (
              <section className="space-y-2">
                <h2 className="font-heading text-lg font-semibold">{t('yourOffers')}</h2>
                {offers.map((offer) => (
                  <div key={offer.id} className="rounded-xl border p-3 text-sm">
                    <p className="font-medium">
                      {locale === 'ar' ? offer.title_ar : offer.title_en}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {locale === 'ar' ? offer.description_ar : offer.description_en}
                    </p>
                  </div>
                ))}
              </section>
            ) : null}

            {notifications.length > 0 ? (
              <section className="space-y-2">
                <h2 className="font-heading text-lg font-semibold">{t('notifications')}</h2>
                <ul className="divide-y rounded-xl border">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-start justify-between gap-2 px-3 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{locale === 'ar' ? n.title_ar : n.title_en}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatLocaleDate(n.created_at, 'd MMM HH:mm', locale)}
                        </p>
                      </div>
                      {!n.read_at ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void markRead(n.id)}
                        >
                          {t('markRead')}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
