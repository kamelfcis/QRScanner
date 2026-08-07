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
        className={side === 'bottom' ? 'max-h-[85svh] rounded-t-2xl' : 'w-full sm:max-w-md'}
      >
        <SheetHeader>
          <SheetTitle>{t('title')}</SheetTitle>
          <SheetDescription className="sr-only">{t('title')}</SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
            <ShoppingBag className="text-muted-foreground/50 h-12 w-12" aria-hidden="true" />
            <p className="font-medium">{t('empty')}</p>
            <p className="text-muted-foreground text-sm">{t('emptyDescription')}</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('browseMenu')}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-2">
              {pricedItems.map((item) => {
                const name = getName(locale, item.name_en, item.name_ar);
                const lineTotal = item.unitPrice * item.quantity;
                return (
                  <div
                    key={item.id}
                    className="border-border/60 flex gap-3 border-b pb-4 last:border-0"
                    data-testid="cart-line"
                  >
                    <div className="bg-muted relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
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
                        <div className="text-muted-foreground/40 flex h-full items-center justify-center text-lg">
                          {name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{name}</p>
                          <p className="text-primary text-sm tabular-nums">
                            {formatCurrencyAmount(lineTotal, currency, { locale: currencyLocale })}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="h-11 w-11 shrink-0"
                          onClick={() => removeItem(item.id)}
                          aria-label={t('removeItem')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="h-11 w-11"
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                          aria-label={t('decreaseQty')}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span
                          className="min-w-8 text-center font-medium tabular-nums"
                          aria-live="polite"
                        >
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="h-11 w-11"
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          aria-label={t('increaseQty')}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-2 space-y-1">
                        <Label htmlFor={`notes-${item.id}`} className="text-xs">
                          {t('editNotes')}
                        </Label>
                        <Input
                          id={`notes-${item.id}`}
                          value={item.notes}
                          maxLength={settings?.max_order_notes_length ?? 200}
                          placeholder={t('itemNotesPlaceholder')}
                          onChange={(e) => setItemNotes(item.id, e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <SheetFooter className="bg-background border-t">
              <div className="flex w-full items-center justify-between text-base font-semibold">
                <span>{t('subtotal')}</span>
                <span className="text-primary tabular-nums">
                  {formatCurrencyAmount(totals.subtotal, currency, { locale: currencyLocale })}
                </span>
              </div>
              <Button
                size="lg"
                className="h-12 w-full text-base font-semibold"
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
