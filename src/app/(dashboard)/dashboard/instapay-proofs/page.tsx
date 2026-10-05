'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useInstapayProofs, useReviewInstapayProof } from '@/hooks/useInstapayProofs';
import { useTranslations, useI18n } from '@/components/providers/RootI18nProvider';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { isValidInstapayReference, normalizeInstapayReference } from '@/lib/payment/instapay-proof';
import { isEcommerceStore } from '@/lib/store-config';
import type { InstapayProofStatus } from '@/types';
import { cn } from '@/lib/utils';

type StatusFilter = InstapayProofStatus | 'all';

const STATUS_OPTIONS: StatusFilter[] = ['pending', 'confirmed', 'rejected', 'all'];

export default function InstapayProofsPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const t = useTranslations('instapayProofs');
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
      { id, status, proofReference: proofs?.find((p) => p.id === id)?.proof_reference },
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
          {proofs.map((proof) => {
            const transferRef = proof.proof_reference
              ? normalizeInstapayReference(proof.proof_reference)
              : null;
            const refValid = isValidInstapayReference(transferRef);

            return (
              <Card key={proof.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        {t('orderReference')}
                      </p>
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
                      {new Date(proof.created_at).toLocaleString(
                        locale === 'ar' ? 'ar-EG' : 'en-GB'
                      )}
                    </p>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">{t('transferReference')}:</span>{' '}
                      {transferRef ? (
                        <span dir="ltr" className="font-mono uppercase">
                          {transferRef}
                        </span>
                      ) : (
                        <Badge
                          variant="outline"
                          className="ms-1 border-amber-500/50 text-amber-800"
                        >
                          {t('missingReference')}
                        </Badge>
                      )}
                      {transferRef && !refValid ? (
                        <Badge
                          variant="outline"
                          className="border-destructive/50 text-destructive ms-2"
                        >
                          {t('invalidReference')}
                        </Badge>
                      ) : null}
                    </div>
                    {proof.amount_note ? (
                      <p className="sm:col-span-2">
                        <span className="text-muted-foreground">{t('amountNote')}:</span>{' '}
                        {proof.amount_note}
                      </p>
                    ) : null}
                  </div>

                  {proof.screenshot_url ? (
                    <Dialog>
                      <DialogTrigger
                        render={
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 text-start text-sm text-[var(--primary)] underline"
                          />
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proof.screenshot_url}
                          alt=""
                          className="h-32 w-32 rounded-md border object-cover"
                        />
                        <span className="inline-flex items-center gap-1">
                          <ExternalLink className="h-4 w-4" />
                          {t('viewScreenshot')}
                        </span>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{t('viewScreenshot')}</DialogTitle>
                        </DialogHeader>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proof.screenshot_url}
                          alt=""
                          className="max-h-[70vh] w-full rounded-md object-contain"
                        />
                      </DialogContent>
                    </Dialog>
                  ) : null}

                  {proof.status === 'pending' ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        className="min-h-9"
                        disabled={reviewProof.isPending || !refValid}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
