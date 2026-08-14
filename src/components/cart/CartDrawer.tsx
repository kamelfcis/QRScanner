'use client';

import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/stores/cart-store';
import { calculateOrderTotals, getUnitPrice } from '@/lib/order/totals';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import { trackCheckoutStart } from '@/lib/analytics';
import { Image } from '@/components/shared/Image';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { locale } = useI18n();
  const t = useTranslations('cart');
  const { data: settings } = useRestaurantSettings();
  const items = useCartStore((s) => s.items);
  const diningMode = useCartStore((s) => s.diningMode);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const setItemNotes = useCartStore((s) => s.setItemNotes);

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';
  const isRtl = locale === 'ar';
  const side = isDesktop ? (isRtl ? 'left' : 'right') : 'bottom';

  const pricedItems = items.map((item) => ({
    ...item,
    unitPrice: getUnitPrice(item.dining_price, item.takeaway_price, diningMode),
  }));
  const totals = calculateOrderTotals(
    pricedItems.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
    settings
  );

  const handleCheckout = () => {
    trackCheckoutStart(
      items.reduce((n, i) => n + i.quantity, 0),
      totals.total
    );
    onOpenChange(false);
    router.push('/checkout');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={
          side === 'bottom'
            ? 'bg-aklet-paper max-h-[88svh] rounded-t-2xl'
            : 'bg-aklet-paper w-full sm:max-w-md'
        }
      >
        <SheetHeader className="border-aklet-line/60 border-b">
          <SheetTitle className="font-heading text-aklet-ink text-base font-bold">
            {t('title')}
          </SheetTitle>
          <SheetDescription className="sr-only">{t('title')}</SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <span className="bg-aklet-sand/70 text-aklet-ink-soft flex h-14 w-14 items-center justify-center rounded-full">
              <ShoppingBag className="h-6 w-6" aria-hidden />
            </span>
            <p className="font-heading text-aklet-ink font-bold">{t('empty')}</p>
            <p className="text-aklet-ink-soft text-sm">{t('emptyDescription')}</p>
            <Button
              variant="outline"
              className="border-aklet-line text-aklet-ink mt-1 h-11 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              {t('browseMenu')}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-2">
              {pricedItems.map((item) => {
                const name = getName(locale, item.name_en, item.name_ar);
                const lineTotal = item.unitPrice * item.quantity;
                return (
                  <div
                    key={item.id}
                    className="border-aklet-line/60 bg-aklet-paper-soft flex gap-3 rounded-xl border p-2.5"
                    data-testid="cart-line"
                  >
                    <div className="bg-aklet-sand/60 relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={name}
                          fill
                          sizes="64px"
                          className="object-cover"
                          containerClassName="absolute inset-0"
                        />
                      ) : (
                        <span className="text-aklet-ink-soft/50 flex h-full items-center justify-center text-lg">
                          {name.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-aklet-ink truncate text-sm font-semibold">{name}</p>
                          <p className="text-aklet-price text-sm font-bold tabular-nums" dir="ltr">
                            {formatCurrencyAmount(lineTotal, currency, { locale: currencyLocale })}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="text-aklet-ink-soft hover:text-destructive flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
                          onClick={() => removeItem(item.id)}
                          aria-label={t('removeItem')}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <div
                          className="border-aklet-line/80 bg-aklet-paper inline-flex h-10 items-stretch overflow-hidden rounded-lg border"
                          role="group"
                          aria-label={t('quantity')}
                        >
                          <button
                            type="button"
                            className="text-aklet-ink hover:bg-aklet-sand/70 flex w-9 items-center justify-center transition-colors"
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            aria-label={t('decreaseQty')}
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <span
                            className="border-aklet-line/80 flex min-w-8 items-center justify-center border-x text-sm font-semibold tabular-nums"
                            aria-live="polite"
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="text-aklet-ink hover:bg-aklet-sand/70 flex w-9 items-center justify-center transition-colors"
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            aria-label={t('increaseQty')}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1">
                        <Label
                          htmlFor={`notes-${item.id}`}
                          className="text-aklet-ink-soft text-[11px]"
                        >
                          {t('editNotes')}
                        </Label>
                        <Input
                          id={`notes-${item.id}`}
                          value={item.notes}
                          maxLength={settings?.max_order_notes_length ?? 200}
                          placeholder={t('itemNotesPlaceholder')}
                          onChange={(e) => setItemNotes(item.id, e.target.value)}
                          className="border-aklet-line/80 bg-aklet-paper h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <SheetFooter className="bg-aklet-paper border-aklet-line/70 border-t">
              <div className="flex w-full items-center justify-between text-sm">
                <span className="text-aklet-ink-soft">{t('subtotal')}</span>
                <span className="text-aklet-ink text-base font-bold tabular-nums" dir="ltr">
                  {formatCurrencyAmount(totals.subtotal, currency, { locale: currencyLocale })}
                </span>
              </div>
              <Button
                size="lg"
                className="bg-aklet-coral-cta hover:bg-aklet-coral-cta/90 h-12 w-full rounded-xl text-base font-bold text-white"
                onClick={handleCheckout}
                data-testid="cart-checkout"
              >
                {t('checkout')}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
