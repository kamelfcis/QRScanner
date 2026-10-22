'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { formatCurrencyAmount } from '@/lib/order/format-currency';
import { prepareInstapayUploadFile } from '@/lib/payment/instapay-image';
import {
  computePrepaidAmounts,
  isPaymentLink,
  type PaymentMethod,
  type PrepaidScope,
} from '@/lib/payment/prepaid';
import { MAX_IMAGE_SIZE_MB, validateImageFile } from '@/lib/upload-validation';
import { cn } from '@/lib/utils';

export interface PrepaidCheckoutItem {
  productId: string;
  quantity: number;
  sizeCode?: string | null;
}

interface InstapayDeliverySectionProps {
  productsTotal: number;
  deliveryFee: number;
  zoneName: string;
  currency: string;
  currencyLocale: 'en' | 'ar';
  orderPaymentRef: string;
  screenshotUrl: string | null;
  amountNote?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryLocationId?: string | null;
  instapayValue: string;
  vodafoneNumber: string;
  availableMethods: PaymentMethod[];
  paymentMethod: PaymentMethod;
  prepaidScope: PrepaidScope;
  cartItems: PrepaidCheckoutItem[];
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onPrepaidScopeChange: (scope: PrepaidScope) => void;
  onScreenshotUrlChange: (value: string | null) => void;
  onAmountNoteChange?: (value: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export function InstapayDeliverySection({
  productsTotal,
  deliveryFee,
  zoneName,
  currency,
  currencyLocale,
  orderPaymentRef,
  screenshotUrl,
  amountNote = '',
  customerName = '',
  customerPhone = '',
  deliveryLocationId = null,
  instapayValue,
  vodafoneNumber,
  availableMethods,
  paymentMethod,
  prepaidScope,
  cartItems,
  onPaymentMethodChange,
  onPrepaidScopeChange,
  onScreenshotUrlChange,
  onAmountNoteChange,
  onUploadingChange,
}: InstapayDeliverySectionProps) {
  const t = useTranslations('checkout');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const proofSaved = Boolean(screenshotUrl);
  const amounts = computePrepaidAmounts(productsTotal, deliveryFee, prepaidScope);
  const money = (value: number) =>
    formatCurrencyAmount(value, currency, { locale: currencyLocale });
  const showInstapay = availableMethods.includes('instapay');
  const showVodafone = availableMethods.includes('vodafone_cash');
  const instapayIsLink = isPaymentLink(instapayValue);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('paymentCopied'));
    } catch {
      toast.error(t('paymentCopyFailed'));
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!orderPaymentRef) {
      const message = t('instapayUploadNeedRef');
      setUploadError(message);
      toast.error(message);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      const message = t('instapayUploadSize');
      setUploadError(message);
      toast.error(message);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      let uploadFile: File;
      try {
        uploadFile = await prepareInstapayUploadFile(file);
        validateImageFile(uploadFile);
      } catch {
        const message = t('instapayUploadType');
        setUploadError(message);
        toast.error(message);
        return;
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('orderRef', orderPaymentRef);
      formData.append('uploadOnly', 'true');
      formData.append('paymentMethod', paymentMethod);
      formData.append('prepaidScope', prepaidScope);
      formData.append('items', JSON.stringify(cartItems));
      if (deliveryLocationId) formData.append('deliveryLocationId', deliveryLocationId);
      if (customerName.trim()) formData.append('customerName', customerName.trim());
      if (customerPhone.trim()) formData.append('customerPhone', customerPhone.trim());
      if (amountNote.trim()) formData.append('amountNote', amountNote.trim());

      const response = await fetch('/api/instapay-proofs', {
        method: 'POST',
        body: formData,
      });

      const body = (await response.json().catch(() => null)) as {
        screenshotUrl?: string;
        path?: string | null;
        error?: string;
        code?: string;
      } | null;

      if (!response.ok || !body?.screenshotUrl) {
        const message =
          body?.code === 'invalid_image_type'
            ? t('instapayUploadType')
            : body?.code === 'image_too_large'
              ? t('instapayUploadSize')
              : t('instapayUploadServer');
        setUploadError(message);
        toast.error(message);
        return;
      }

      onScreenshotUrlChange(body.screenshotUrl);
      toast.success(t('instapayUploadSuccess'));
    } catch {
      const message = t('instapayUploadFailed');
      setUploadError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const scopeOptions: Array<{
    id: PrepaidScope;
    title: string;
    body: string;
    badge?: string;
  }> = [
    {
      id: 'shipping_only',
      title: t('paymentScopeShippingTitle'),
      body: t('paymentScopeShippingBody'),
      badge: t('paymentMostChosen'),
    },
    {
      id: 'full',
      title: t('paymentScopeFullTitle'),
      body: t('paymentScopeFullBody'),
    },
  ];

  const methodOptions = [
    showInstapay ? { id: 'instapay' as const, label: t('paymentMethodInstapay') } : null,
    showVodafone ? { id: 'vodafone_cash' as const, label: t('paymentMethodVodafone') } : null,
  ].filter((option): option is { id: PaymentMethod; label: string } => option != null);

  return (
    <Card
      className="border-[var(--menu-line)] bg-[var(--menu-surface)] ring-[var(--menu-line)]"
      data-testid="instapay-delivery-section"
    >
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-[var(--menu-wine)]">
          {t('paymentSystemTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3" role="radiogroup" aria-label={t('paymentSystemTitle')}>
          {scopeOptions.map((option) => {
            const selected = prepaidScope === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`payment-scope-${option.id}`}
                onClick={() => onPrepaidScopeChange(option.id)}
                className={cn(
                  'rounded-xl border px-4 py-3 text-start transition-colors',
                  selected
                    ? 'border-[var(--menu-wine)] bg-[var(--menu-wine-wash)]'
                    : 'border-[var(--menu-line-strong)] bg-[var(--menu-surface)] hover:border-[var(--menu-gold-soft)]'
                )}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--menu-ink)]">{option.title}</span>
                  {option.badge ? (
                    <Badge className="border-0 bg-[var(--menu-wine)] text-[#FDF7F0]">
                      {option.badge}
                    </Badge>
                  ) : null}
                </span>
                <span className="mt-1 block text-sm text-[var(--menu-ink-soft)]">
                  {option.body}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--menu-ink)]">{t('paymentMethodTitle')}</p>
          <div
            className={cn('grid gap-3', methodOptions.length > 1 && 'sm:grid-cols-2')}
            role="radiogroup"
            aria-label={t('paymentMethodTitle')}
          >
            {methodOptions.map((option) => {
              const selected = paymentMethod === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`payment-method-${option.id}`}
                  onClick={() => onPaymentMethodChange(option.id)}
                  className={cn(
                    'min-h-12 rounded-xl border px-3 py-3 text-sm font-medium transition-colors',
                    selected
                      ? 'border-[var(--menu-wine)] bg-[var(--menu-wine-wash)] text-[var(--menu-wine)]'
                      : 'border-[var(--menu-line-strong)] bg-[var(--menu-surface)] text-[var(--menu-ink-soft)] hover:border-[var(--menu-gold-soft)] hover:text-[var(--menu-ink)]'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--menu-wine)] bg-[var(--menu-wine-wash)] p-4 text-center">
          <p
            className="font-heading text-3xl font-bold tabular-nums text-[var(--menu-wine)]"
            data-testid="payment-amount-due"
          >
            {money(amounts.amountDue)}
          </p>
        </div>

        {paymentMethod === 'instapay' && showInstapay ? (
          <div className="space-y-2">
            {instapayIsLink ? (
              <a
                href={instapayValue}
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
            ) : null}
            <p className="break-all text-center text-sm text-[var(--menu-ink)]" dir="ltr">
              {instapayValue}
            </p>
            <button
              type="button"
              data-testid="instapay-copy"
              onClick={() => copyValue(instapayValue)}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'h-11 w-full border-[var(--menu-line-strong)]'
              )}
            >
              <Copy className="me-2 h-4 w-4" aria-hidden="true" />
              {t('paymentCopy')}
            </button>
          </div>
        ) : null}

        {paymentMethod === 'vodafone_cash' && showVodafone ? (
          <div className="space-y-2 rounded-xl border border-[var(--menu-line)] p-4">
            <p className="text-sm font-medium text-[var(--menu-ink)]">
              {t('paymentVodafoneLabel')}
            </p>
            <p
              className="font-heading text-2xl font-semibold tabular-nums text-[var(--menu-wine)]"
              dir="ltr"
              data-testid="vodafone-number"
            >
              {vodafoneNumber}
            </p>
            <button
              type="button"
              data-testid="vodafone-copy"
              onClick={() => copyValue(vodafoneNumber)}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'h-11 w-full border-[var(--menu-wine)] text-[var(--menu-wine)] hover:bg-[var(--menu-wine-wash)]'
              )}
            >
              <Copy className="me-2 h-4 w-4" aria-hidden="true" />
              {t('paymentCopy')}
            </button>
            <p className="text-sm text-[var(--menu-ink-soft)]">{t('paymentVodafoneHint')}</p>
          </div>
        ) : null}

        <dl className="space-y-2 rounded-xl border border-[var(--menu-line)] p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--menu-ink-soft)]">{t('paymentProductsTotal')}</dt>
            <dd
              className="tabular-nums text-[var(--menu-ink)]"
              data-testid="payment-products-total"
            >
              {money(amounts.productsTotal)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--menu-ink-soft)]">
              {t('paymentShippingCost', { zone: zoneName })}
            </dt>
            <dd className="tabular-nums text-[var(--menu-ink)]" data-testid="payment-shipping">
              {money(amounts.deliveryFee)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--menu-ink-soft)]">{t('paymentGrandTotal')}</dt>
            <dd
              className="font-medium tabular-nums text-[var(--menu-ink)]"
              data-testid="payment-grand-total"
            >
              {money(amounts.grandTotal)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--menu-ink)]">
              {prepaidScope === 'full' ? t('paymentDueNowFull') : t('paymentDueNowShipping')}
            </dt>
            <dd className="font-semibold tabular-nums text-[var(--menu-wine)]">
              {money(amounts.amountDue)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--menu-ink-soft)]">{t('paymentRemaining')}</dt>
            <dd className="tabular-nums text-[var(--menu-ink)]" data-testid="payment-remaining">
              {money(amounts.remainingOnDelivery)}
            </dd>
          </div>
        </dl>

        <p className="text-sm text-[var(--menu-ink-soft)]">
          {t('instapayProofScreenshotRequired')}
        </p>

        <div className="space-y-2">
          <Label>{t('instapayProofScreenshot')}</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="instapay-screenshot-input"
          />
          <button
            type="button"
            disabled={uploading || !orderPaymentRef}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'h-11 w-full border-[var(--menu-line-strong)]'
            )}
            data-testid="instapay-screenshot-button"
          >
            {uploading ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="me-2 h-4 w-4" />
            )}
            {uploading
              ? t('instapayUploading')
              : screenshotUrl
                ? t('instapayChangeScreenshot')
                : t('instapayProofScreenshot')}
          </button>
          {uploadError ? (
            <p className="text-destructive text-xs" data-testid="instapay-upload-error">
              {uploadError}
            </p>
          ) : null}
          {screenshotUrl ? (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotUrl}
                alt=""
                className="h-16 w-16 rounded-md border border-emerald-500/50 object-cover"
              />
              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-300">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {proofSaved ? t('instapayUploaded') : t('instapayUploading')}
                </span>
                <button
                  type="button"
                  className="text-destructive text-start text-sm underline"
                  onClick={() => onScreenshotUrlChange(null)}
                >
                  {t('instapayRemoveScreenshot')}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {onAmountNoteChange ? (
          <div className="space-y-2">
            <Label htmlFor="instapay-amount-note">{t('instapayAmountNote')}</Label>
            <Input
              id="instapay-amount-note"
              value={amountNote}
              onChange={(event) => onAmountNoteChange(event.target.value)}
              placeholder={t('instapayAmountNotePlaceholder')}
              className="h-11 min-h-11"
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
