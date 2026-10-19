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
import { prepareInstapayUploadFile } from '@/lib/payment/instapay-image';
import { MAX_IMAGE_SIZE_MB, validateImageFile } from '@/lib/upload-validation';
import { cn } from '@/lib/utils';

interface InstapayDeliverySectionProps {
  deliveryFee: number;
  currency: string;
  currencyLocale: 'en' | 'ar';
  orderPaymentRef: string;
  screenshotUrl: string | null;
  amountNote?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryLocationId?: string | null;
  onScreenshotUrlChange: (value: string | null) => void;
  onAmountNoteChange?: (value: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export function InstapayDeliverySection({
  deliveryFee,
  currency,
  currencyLocale,
  orderPaymentRef,
  screenshotUrl,
  amountNote = '',
  customerName = '',
  customerPhone = '',
  deliveryLocationId = null,
  onScreenshotUrlChange,
  onAmountNoteChange,
  onUploadingChange,
}: InstapayDeliverySectionProps) {
  const t = useTranslations('checkout');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const proofSaved = Boolean(screenshotUrl);

  const formattedFee = formatCurrencyAmount(deliveryFee, currency, { locale: currencyLocale });

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(orderPaymentRef);
      toast.success(t('instapayRefCopied'));
    } catch {
      toast.error(t('instapayRefCopyFailed'));
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
      formData.append('deliveryFee', String(deliveryFee));
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
