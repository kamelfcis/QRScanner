'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useInstapayProofs, useReviewInstapayProof } from '@/hooks/useInstapayProofs';
import { useTranslations, useI18n } from '@/components/providers/RootI18nProvider';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { isEcommerceStore } from '@/lib/store-config';
import type { InstapayProofStatus } from '@/types';
import { cn } from '@/lib/utils';

type StatusFilter = InstapayProofStatus | 'all';

const STATUS_OPTIONS: StatusFilter[] = ['pending', 'confirmed', 'rejected', 'all'];

export default function InstapayProofsPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const t = useTranslations('instapayProofs');
  const tCommon = useTranslations('common');
  const { data: settings, isLoading: settingsLoading } = useRestaurantSettings();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const { data: proofs, isLoading, error, refetch } = useInstapayProofs(statusFilter);
  const reviewProof = useReviewInstapayProof();
  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';

  useEffect(() => {
    if (!isEcommerceStore) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleReview = (id: string, status: Exclude<InstapayProofStatus, 'pending'>) => {
    reviewProof.mutate(
      { id, status },
      {
        onSuccess: () => toast.success(status === 'confirmed' ? t('confirmed') : t('rejected')),
        onError: () => toast.error(t('reviewFailed')),
      }
    );
  };

  if (!isEcommerceStore) return <LoadingPage />;
  if (settingsLoading || isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground mb-1 text-xs uppercase tracking-[0.16em]">
          {t('eyebrow')}
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-[0.08em]">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">{t('description')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            className="min-h-9"
            onClick={() => setStatusFilter(status)}
          >
            {t(`filter.${status}`)}
          </Button>
        ))}
      </div>

      {!proofs?.length ? (
        <EmptyState title={t('empty')} description={t('emptyDescription')} />
      ) : (
        <div className="grid gap-4">
          {proofs.map((proof) => (
            <Card key={proof.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="font-mono text-base tabular-nums">
                      {proof.order_ref}
                    </CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {proof.customer_name}
                      {proof.customer_phone ? ` · ${proof.customer_phone}` : ''}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      'shrink-0 border-0 capitalize',
                      proof.status === 'pending' &&
                        'bg-amber-500/15 text-amber-800 dark:text-amber-200',
                      proof.status === 'confirmed' &&
                        'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
                      proof.status === 'rejected' && 'bg-destructive/15 text-destructive'
                    )}
                  >
                    {t(`status.${proof.status}`)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">{t('deliveryFee')}:</span>{' '}
                    {formatCurrencyAmount(Number(proof.delivery_fee), currency, {
                      locale: currencyLocale,
                    })}
                  </p>
                  <p>
                    <span className="text-muted-foreground">{t('createdAt')}:</span>{' '}
                    {new Date(proof.created_at).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB')}
                  </p>
                  {proof.proof_reference ? (
                    <p className="sm:col-span-2">
                      <span className="text-muted-foreground">{t('proofReference')}:</span>{' '}
                      <span dir="ltr" className="font-mono">
                        {proof.proof_reference}
                      </span>
                    </p>
                  ) : null}
                  {proof.amount_note ? (
                    <p className="sm:col-span-2">
                      <span className="text-muted-foreground">{t('amountNote')}:</span>{' '}
                      {proof.amount_note}
                    </p>
                  ) : null}
                </div>

                {proof.screenshot_url ? (
                  <a
                    href={proof.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[var(--primary)] underline"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proof.screenshot_url}
                      alt=""
                      className="h-20 w-20 rounded-md border object-cover"
                    />
                    <ExternalLink className="h-4 w-4" />
                    {t('viewScreenshot')}
                  </a>
                ) : null}

                {proof.status === 'pending' ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      className="min-h-9"
                      disabled={reviewProof.isPending}
                      onClick={() => handleReview(proof.id, 'confirmed')}
                    >
                      <Check className="me-1.5 h-4 w-4" />
                      {t('confirm')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive min-h-9"
                      disabled={reviewProof.isPending}
                      onClick={() => handleReview(proof.id, 'rejected')}
                    >
                      <X className="me-1.5 h-4 w-4" />
                      {t('reject')}
                    </Button>
                  </div>
                ) : proof.reviewed_at ? (
                  <p className="text-muted-foreground text-xs">
                    {t('reviewedAt', {
                      date: new Date(proof.reviewed_at).toLocaleString(
                        locale === 'ar' ? 'ar-EG' : 'en-GB'
                      ),
                    })}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
