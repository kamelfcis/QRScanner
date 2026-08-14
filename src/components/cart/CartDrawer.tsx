'use client';

import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingBasket, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/stores/cart-store';
import { calculateOrderTotals, getUnitPrice } from '@/lib/order/totals';
import { formatCurrencyAmount } from '@/lib/order/format-currency';
import { useMenuSettings } from '@/components/menu/MenuSettingsProvider';
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
  const { settings, currency } = useMenuSettings();
  const items = useCartStore((s) => s.items);
  const diningMode = useCartStore((s) => s.diningMode);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const setItemNotes = useCartStore((s) => s.setItemNotes);

  const currencyLocale = locale === 'ar' ? 'ar' : 'en';
  // RTL is the primary locale here, so the desktop drawer opens from the start edge.
  const side = isDesktop ? 'right' : 'bottom';

  const pricedItems = items.map((item) => ({
    ...item,
    unitPrice: getUnitPrice(item.dining_price, item.takeaway_price, diningMode),
  }));
  const totals = calculateOrderTotals(
    pricedItems.map((item) => ({ quantity: item.quantity, unitPrice: item.unitPrice })),
    settings
  );

  const handleCheckout = () => {
    trackCheckoutStart(
      items.reduce((total, item) => total + item.quantity, 0),
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
            ? 'max-h-[86svh] rounded-t-2xl bg-[var(--hm-surface)]'
            : 'w-full bg-[var(--hm-surface)] sm:max-w-md'
        }
      >
        <SheetHeader className="border-b border-[var(--hm-line)]">
          <SheetTitle className="text-[var(--hm-ink)]">{t('title')}</SheetTitle>
          <SheetDescription className="text-xs text-[var(--hm-ink-soft)]">
            {t('drawerSubtitle')}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--hm-surface-muted)]">
              <ShoppingBasket className="h-7 w-7 text-[var(--hm-ink-faint)]" aria-hidden="true" />
            </span>
            <p className="font-semibold text-[var(--hm-ink)]">{t('empty')}</p>
            <p className="max-w-xs text-sm text-[var(--hm-ink-soft)]">{t('emptyDescription')}</p>
            <Button
              variant="outline"
              className="mt-1 border-[var(--hm-line-strong)]"
              onClick={() => onOpenChange(false)}
            >
              {t('browseMenu')}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {pricedItems.map((item) => {
                const name = getName(locale, item.name_en, item.name_ar);
                const lineTotal = item.unitPrice * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="flex gap-3 rounded-[var(--hm-radius)] border border-[var(--hm-line)] bg-[var(--hm-surface)] p-2.5"
                    data-testid="cart-line"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--hm-radius-sm)] border border-[var(--hm-line)] bg-white">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={name}
                          fill
                          sizes="64px"
                          className="object-contain p-1"
                          containerClassName="absolute inset-0"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-lg text-[var(--hm-ink-faint)]">
                          {name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium text-[var(--hm-ink)]">
                            {name}
                          </p>
                          <p
                            className="mt-0.5 text-sm font-bold tabular-nums text-[var(--hm-price)]"
                            dir="ltr"
                          >
                            {formatCurrencyAmount(lineTotal, currency, { locale: currencyLocale })}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--hm-radius-sm)] text-[var(--hm-ink-faint)] transition-colors hover:bg-red-50 hover:text-red-600"
                          onClick={() => removeItem(item.id)}
                          aria-label={t('removeItem')}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="inline-flex h-9 items-stretch overflow-hidden rounded-[var(--hm-radius-sm)] border border-[var(--hm-line-strong)]">
                          <button
                            type="button"
                            className="flex w-9 items-center justify-center transition-colors hover:bg-[var(--hm-surface-muted)]"
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            aria-label={t('decreaseQty')}
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <span
                            className="flex min-w-9 items-center justify-center border-x border-[var(--hm-line-strong)] text-sm font-semibold tabular-nums"
                            aria-live="polite"
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="flex w-9 items-center justify-center transition-colors hover:bg-[var(--hm-surface-muted)]"
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            aria-label={t('increaseQty')}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1">
                        <Label
                          htmlFor={`notes-${item.id}`}
                          className="text-[11px] text-[var(--hm-ink-faint)]"
                        >
                          {t('editNotes')}
                        </Label>
                        <Input
                          id={`notes-${item.id}`}
                          value={item.notes}
                          maxLength={settings?.max_order_notes_length ?? 200}
                          placeholder={t('itemNotesPlaceholder')}
                          onChange={(event) => setItemNotes(item.id, event.target.value)}
                          className="h-9 border-[var(--hm-line-strong)] text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <SheetFooter className="border-t border-[var(--hm-line)] bg-[var(--hm-surface)]">
              <div className="flex w-full items-center justify-between text-base font-semibold text-[var(--hm-ink)]">
                <span>{t('subtotal')}</span>
                <span className="tabular-nums text-[var(--hm-price)]" dir="ltr">
                  {formatCurrencyAmount(totals.subtotal, currency, { locale: currencyLocale })}
                </span>
              </div>
              <Button
                size="lg"
                className="h-12 w-full rounded-[var(--hm-radius)] bg-[var(--hm-accent)] text-base font-semibold text-[var(--hm-on-accent)] hover:bg-[var(--hm-accent-strong)]"
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
