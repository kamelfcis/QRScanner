'use client';

import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { formatCurrencyAmount } from '@/lib/order/format-currency';
import { instapayHandle, instapayPaymentUrl } from '@/lib/payment/instapay';
import { cn } from '@/lib/utils';

interface InstapayDeliverySectionProps {
  deliveryFee: number;
  currency: string;
  currencyLocale: 'en' | 'ar';
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
}

export function InstapayDeliverySection({
  deliveryFee,
  currency,
  currencyLocale,
  acknowledged,
  onAcknowledgedChange,
}: InstapayDeliverySectionProps) {
  const t = useTranslations('checkout');

  const formattedFee = formatCurrencyAmount(deliveryFee, currency, { locale: currencyLocale });

  return (
    <Card
      className="border-[var(--menu-line)] bg-[var(--menu-surface)] ring-[var(--menu-line)]"
      data-testid="instapay-delivery-section"
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/instapay-logo.png"
            alt="InstaPay official logo"
            width={140}
            height={36}
            className="h-9 w-auto shrink-0 rounded-md object-contain"
          />
          <CardTitle className="font-heading text-[var(--menu-wine)]">
            {t('instapayTitle')}
          </CardTitle>
        </div>
        <CardDescription>{t('instapayDescription', { amount: formattedFee })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[var(--menu-ink-soft)]">
          <span className="font-medium text-[var(--menu-ink)]">{t('instapayHandleLabel')}:</span>{' '}
          <span dir="ltr" className="font-mono tabular-nums">
            {instapayHandle}
          </span>
        </p>
        <a
          href={instapayPaymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="instapay-pay-button"
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'h-11 w-full border-[var(--menu-wine)] text-[var(--menu-wine)] hover:bg-[var(--menu-wine-wash)]'
          )}
        >
          <ExternalLink className="me-2 h-4 w-4" aria-hidden="true" />
          {t('instapayPayButton')}
        </a>
        <label
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--menu-line)] p-3 text-sm',
            acknowledged && 'border-[var(--menu-wine)] bg-[var(--menu-wine-wash)]'
          )}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => onAcknowledgedChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--menu-wine)]"
            data-testid="instapay-acknowledge"
          />
          <span>{t('instapayAcknowledge')}</span>
        </label>
      </CardContent>
    </Card>
  );
}
