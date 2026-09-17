'use client';

import { TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTopSellingProducts, useApplyBestsellerBadges } from '@/hooks/useTopSellingProducts';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import { toast } from 'sonner';
import { hasHettSamakaTier1 } from '@/i18n/config';

export function TopSellingProductsCard() {
  const t = useTranslations('dashboard');
  const { locale } = useI18n();
  const { data, isLoading } = useTopSellingProducts();
  const applyBadges = useApplyBestsellerBadges();

  if (!hasHettSamakaTier1) return null;

  const handleApplyBadges = () => {
    applyBadges.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(t('topSellingBadgesApplied', { count: result.updated }));
      },
      onError: () => toast.error(t('topSellingBadgesFailed')),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="text-brand-primary h-4 w-4" aria-hidden="true" />
            {t('topSellingTitle')}
          </CardTitle>
          <p className="text-muted-foreground text-xs">{t('topSellingDescription')}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10 shrink-0"
          disabled={applyBadges.isPending || isLoading || !data?.length}
          onClick={handleApplyBadges}
        >
          {t('topSellingApplyBadges')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : !data?.length ? (
          <p className="text-muted-foreground py-4 text-center text-sm">{t('topSellingEmpty')}</p>
        ) : (
          <ol className="space-y-2">
            {data.map((row, index) => {
              const label = getName(locale, row.name_en, row.name_ar, row.name_fr, row.name_nl);
              return (
                <li
                  key={row.product_id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-muted-foreground w-5 shrink-0 text-xs tabular-nums">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-medium">{label}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {t('topSellingQty', { count: row.quantity })}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
