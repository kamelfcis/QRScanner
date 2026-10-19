'use client';

import { useMemo, useState } from 'react';
import { Ban, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useStaffOrderCatalog } from '@/hooks/useStaffOrder';
import { useAllProducts, useToggleProductAvailability } from '@/hooks/useProducts';
import { useAllCategories } from '@/hooks/useCategories';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { productTerm } from '@/lib/i18n/product-terminology';
import { isEcommerceStore } from '@/lib/store-config';
import { getLocalizedText } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function SoldOutPanel({
  triggerClassName,
  variant = 'outline',
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  triggerClassName?: string;
  variant?: 'outline' | 'secondary' | 'default';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [query, setQuery] = useState('');
  const { locale, dir } = useI18n();
  const tRaw = useTranslations('soldOut');
  const pt = (key: string) => productTerm(tRaw, key);
  const tCommon = useTranslations('common');
  const { data: catalog, isLoading: catalogLoading } = useStaffOrderCatalog({
    includeUnavailable: true,
  });
  const { data: allProducts, isLoading: productsLoading } = useAllProducts();
  const { data: allCategories, isLoading: categoriesLoading } = useAllCategories();
  const toggle = useToggleProductAvailability();

  const isLoading = isEcommerceStore ? productsLoading || categoriesLoading : catalogLoading;

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (isEcommerceStore) {
      const categoryMap = new Map((allCategories ?? []).map((category) => [category.id, category]));

      return (allProducts ?? [])
        .map((product) => {
          const category =
            categoryMap.get(product.category_id) ??
            (product.category
              ? {
                  id: product.category.id,
                  name_en: product.category.name_en,
                  name_ar: product.category.name_ar,
                  name_fr: null,
                  name_nl: null,
                }
              : null);

          if (!category) return null;

          return {
            category,
            product,
            name: getLocalizedText(locale, {
              en: product.name_en,
              ar: product.name_ar,
              fr: product.name_fr,
              nl: product.name_nl,
            }),
          };
        })
        .filter(
          (row): row is NonNullable<typeof row> =>
            row !== null && (!needle || row.name.toLowerCase().includes(needle))
        );
    }

    return (catalog ?? [])
      .flatMap((category) =>
        category.products.map((product) => ({
          category,
          product,
          name: getLocalizedText(locale, {
            en: product.name_en,
            ar: product.name_ar,
            fr: product.name_fr,
            nl: product.name_nl,
          }),
        }))
      )
      .filter((row) => !needle || row.name.toLowerCase().includes(needle));
  }, [allCategories, allProducts, catalog, locale, query]);

  const soldOutCount = rows.filter((row) => !row.product.is_available).length;

  const handleToggle = (id: string, nextAvailable: boolean) => {
    toggle.mutate(
      { id, is_available: nextAvailable },
      {
        onSuccess: () => {
          toast.success(nextAvailable ? pt('backInStock') : pt('markedSoldOut'));
        },
        onError: () => {
          toast.error(tCommon('error'));
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger ? (
        <SheetTrigger
          render={
            <Button
              type="button"
              variant={variant}
              className={cn('min-h-11', triggerClassName)}
              aria-label={pt('title')}
            />
          }
        >
          <Ban className="me-2 h-4 w-4 shrink-0" aria-hidden="true" />
          {pt('title')}
          {soldOutCount > 0 ? (
            <span className="bg-destructive/15 text-destructive ms-2 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">
              {soldOutCount}
            </span>
          ) : null}
        </SheetTrigger>
      ) : null}
      <SheetContent
        side={dir === 'rtl' ? 'left' : 'right'}
        className="flex w-full flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader className="border-b pb-4">
          <SheetTitle>{pt('title')}</SheetTitle>
          <SheetDescription>{pt('description')}</SheetDescription>
        </SheetHeader>

        <div className="px-4 py-3">
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={pt('searchPlaceholder')}
              className="min-h-11 ps-9"
              aria-label={pt('searchPlaceholder')}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center text-sm">{tCommon('loading')}</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">{pt('empty')}</p>
          ) : (
            <ul className="divide-y">
              {rows.map(({ product, name, category }) => (
                <li
                  key={product.id}
                  className="flex min-h-11 items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'truncate text-sm font-medium',
                        !product.is_available && 'text-muted-foreground line-through'
                      )}
                    >
                      {name}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {getLocalizedText(locale, {
                        en: category.name_en,
                        ar: category.name_ar,
                        fr: 'name_fr' in category ? category.name_fr : null,
                        nl: 'name_nl' in category ? category.name_nl : null,
                      })}
                    </p>
                  </div>
                  <div className="flex min-h-11 min-w-11 shrink-0 items-center justify-center">
                    <Switch
                      checked={product.is_available}
                      disabled={toggle.isPending}
                      aria-label={product.is_available ? pt('markSoldOut') : pt('markAvailable')}
                      onCheckedChange={(checked) => handleToggle(product.id, checked)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
