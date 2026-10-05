'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { formatCurrencyAmount } from '@/lib/order/format-currency';
import { instapayHandle, instapayPaymentUrl } from '@/lib/payment/instapay';
import { isValidInstapayReference, normalizeInstapayReference } from '@/lib/payment/instapay-proof';
import { cn } from '@/lib/utils';

interface InstapayDeliverySectionProps {
  deliveryFee: number;
  currency: string;
  currencyLocale: 'en' | 'ar';
  orderPaymentRef: string;
  proofReference: string;
  screenshotUrl: string | null;
  amountNote?: string;
  onProofReferenceChange: (value: string) => void;
  onScreenshotUrlChange: (value: string | null) => void;
  onAmountNoteChange?: (value: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  onReferenceStatusChange?: (status: {
    formatValid: boolean;
    duplicate: boolean;
    checking: boolean;
  }) => void;
}

export function InstapayDeliverySection({
  deliveryFee,
  currency,
  currencyLocale,
  orderPaymentRef,
  proofReference,
  screenshotUrl,
  amountNote = '',
  onProofReferenceChange,
  onScreenshotUrlChange,
  onAmountNoteChange,
  onUploadingChange,
  onReferenceStatusChange,
}: InstapayDeliverySectionProps) {
  const t = useTranslations('checkout');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [checkingReference, setCheckingReference] = useState(false);
  const [referenceDuplicate, setReferenceDuplicate] = useState(false);
  const [referenceTouched, setReferenceTouched] = useState(false);

  const formattedFee = formatCurrencyAmount(deliveryFee, currency, { locale: currencyLocale });
  const formatValid = isValidInstapayReference(proofReference);
  const duplicate = formatValid && referenceDuplicate;
  const checking = formatValid && checkingReference;
  const showFormatError = referenceTouched && proofReference.trim() !== '' && !formatValid;
  const showDuplicateError = referenceTouched && duplicate && !checking;

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  useEffect(() => {
    onReferenceStatusChange?.({
      formatValid,
      duplicate,
      checking,
    });
  }, [formatValid, duplicate, checking, onReferenceStatusChange]);

  useEffect(() => {
    if (!formatValid) {
      return;
    }

    const normalized = normalizeInstapayReference(proofReference);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCheckingReference(true);
      try {
        const params = new URLSearchParams({
          reference: normalized,
          excludeOrderRef: orderPaymentRef,
        });
        const response = await fetch(`/api/instapay-proofs?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setReferenceDuplicate(false);
          return;
        }
        const body = (await response.json()) as { available?: boolean };
        setReferenceDuplicate(body.available === false);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setReferenceDuplicate(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCheckingReference(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [proofReference, formatValid, orderPaymentRef]);

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(orderPaymentRef);
      toast.success(t('instapayRefCopied'));
    } catch {
      toast.error(t('instapayRefCopyFailed'));
    }
  };

  const handleReferenceBlur = () => {
    setReferenceTouched(true);
    const normalized = normalizeInstapayReference(proofReference);
    if (normalized !== proofReference) {
      onProofReferenceChange(normalized);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('orderRef', orderPaymentRef);
      formData.append('uploadOnly', 'true');

      const response = await fetch('/api/instapay-proofs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Upload failed');
      }

      const { screenshotUrl: url } = (await response.json()) as { screenshotUrl: string };
      onScreenshotUrlChange(url);
      toast.success(t('instapayUploadSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('instapayUploadFailed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-[var(--menu-wine)] bg-[var(--menu-wine-wash)] p-4 text-center">
          <p className="font-heading text-3xl font-bold tabular-nums text-[var(--menu-wine)]">
            {formattedFee}
          </p>
          <p className="mt-1 text-sm text-[var(--menu-ink-soft)]">
            {t('instapayAmountExact', { amount: formattedFee, handle: instapayHandle })}
          </p>
        </div>

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

        <div className="space-y-2">
          <Label>{t('instapayOrderRef')}</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={orderPaymentRef}
              dir="ltr"
              className="h-11 min-h-11 font-mono tabular-nums"
              data-testid="instapay-order-ref"
            />
            <button
              type="button"
              onClick={copyRef}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'icon' }),
                'h-11 w-11 shrink-0 border-[var(--menu-line-strong)]'
              )}
              aria-label={t('instapayCopyRef')}
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="text-sm text-[var(--menu-ink-soft)]">{t('instapayProofLabel')}</p>

        <div className="space-y-2">
          <Label htmlFor="instapay-proof-ref">{t('instapayProofReference')}</Label>
          <Input
            id="instapay-proof-ref"
            value={proofReference}
            onChange={(event) => onProofReferenceChange(event.target.value)}
            onBlur={handleReferenceBlur}
            placeholder={t('instapayProofReferencePlaceholder')}
            dir="ltr"
            className={cn(
              'h-11 min-h-11 font-mono uppercase',
              (showFormatError || showDuplicateError) && 'border-destructive'
            )}
            data-testid="instapay-proof-reference"
            aria-invalid={showFormatError || showDuplicateError}
          />
          {checking ? (
            <p className="text-muted-foreground text-xs">{t('instapayReferenceChecking')}</p>
          ) : null}
          {showFormatError ? (
            <p className="text-destructive text-xs" data-testid="instapay-reference-format-error">
              {t('instapayReferenceInvalid')}
            </p>
          ) : null}
          {showDuplicateError ? (
            <p
              className="text-destructive text-xs"
              data-testid="instapay-reference-duplicate-error"
            >
              {t('instapayReferenceDuplicate')}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>{t('instapayProofScreenshot')}</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="instapay-screenshot-input"
          />
          <button
            type="button"
            disabled={uploading}
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
                  {t('instapayUploaded')}
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
