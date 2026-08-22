'use client';

import { format } from 'date-fns';
import { Pencil, Tag, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/shared/Image';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { formatCurrencyAmount } from '@/lib/order/format-currency';
import { cn } from '@/lib/utils';
import type { Offer } from '@/types';

interface OffersListProps {
  offers: Offer[];
  currency: string;
  onEdit: (offer: Offer) => void;
  onDelete: (id: string) => void;
  onToggle: (offer: Offer) => void;
}

export function OffersList({ offers, currency, onEdit, onDelete, onToggle }: OffersListProps) {
  const t = useTranslations('offers');
  const tCommon = useTranslations('common');

  return (
    <ul className="space-y-3" aria-label={t('title')}>
      {offers.map((offer) => {
        const discountLabel =
          offer.discount_type === 'percentage'
            ? `${offer.discount_value}%`
            : formatCurrencyAmount(offer.discount_value, currency, { plain: true });

        return (
          <li key={offer.id}>
            <article
              className={cn(
                'bg-card group flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4',
                'ring-foreground/10 ring-1',
                'hover:bg-muted/70 hover:ring-foreground/20 transition-colors duration-200',
                'motion-reduce:transition-none'
              )}
            >
              <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-xl sm:size-20">
                {offer.image_url ? (
                  <Image
                    src={offer.image_url}
                    alt={offer.title_en}
                    fill
                    className="object-cover"
                    sizes="80px"
                    containerClassName="absolute inset-0"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Tag
                      className="text-muted-foreground/50 size-7"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-base font-semibold leading-tight sm:text-lg">
                    {offer.title_en}
                  </h2>
                  <Badge
                    className={cn(
                      'border-0',
                      offer.is_active
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-500/15 text-rose-800 dark:text-rose-200'
                    )}
                  >
                    {offer.is_active ? tCommon('active') : tCommon('inactive')}
                  </Badge>
                  <Badge className="border-0 bg-rose-600/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200">
                    {discountLabel}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm" dir="rtl">
                  {offer.title_ar}
                </p>
                {offer.description_en ? (
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {offer.description_en}
                  </p>
                ) : null}
                {(offer.start_date || offer.end_date) && (
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {offer.start_date
                      ? `${t('validFrom')} ${format(new Date(offer.start_date), 'MMM d, yyyy')}`
                      : null}
                    {offer.start_date && offer.end_date ? (
                      <span className="mx-1.5" aria-hidden="true">
                        ·
                      </span>
                    ) : null}
                    {offer.end_date
                      ? `${t('validUntil')} ${format(new Date(offer.end_date), 'MMM d, yyyy')}`
                      : null}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-end gap-1 sm:ps-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  onClick={() => onToggle(offer)}
                  aria-label={
                    offer.is_active ? `Deactivate ${offer.title_en}` : `Activate ${offer.title_en}`
                  }
                >
                  {offer.is_active ? (
                    <ToggleRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ToggleLeft className="text-muted-foreground h-5 w-5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  onClick={() => onEdit(offer)}
                  aria-label={`${tCommon('edit')} ${offer.title_en}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive min-h-11 min-w-11"
                  onClick={() => onDelete(offer.id)}
                  aria-label={`${tCommon('delete')} ${offer.title_en}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
