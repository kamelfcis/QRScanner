'use client';

import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
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

const stepperButton =
  'flex h-9 w-9 items-center justify-center text-[var(--menu-ink)] transition-colors hover:bg-[var(--menu-gold-wash)]';

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { locale } = useI18n();
  const t = useTranslations('cart');
  const tCommon = useTranslations('accessibility');
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
  const count = items.reduce((n, i) => n + i.quantity, 0);

  const handleCheckout = () => {
    trackCheckoutStart(count, totals.total);
    onOpenChange(false);
    router.push('/checkout');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        showCloseButton={false}
        className={
          side === 'bottom'
            ? 'max-h-[88svh] gap-0 rounded-t-2xl bg-[var(--menu-surface)] p-0'
            : 'w-full gap-0 bg-[var(--menu-surface)] p-0 sm:max-w-md'
        }
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label={tCommon('close')}
          className="absolute end-3 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full text-[var(--menu-ink-soft)] transition-colors hover:bg-[var(--menu-gold-wash)] hover:text-[var(--menu-ink)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex max-h-[88svh] flex-col overflow-hidden md:h-full md:max-h-none">
          <div className="border-b border-[var(--menu-line)] pb-3 pe-14 ps-4 pt-4">
            <SheetTitle className="font-heading text-lg font-semibold text-[var(--menu-ink)]">
              {t('title')}
            </SheetTitle>
            <SheetDescription className="text-xs text-[var(--menu-ink-soft)]">
              {count > 0 ? t('itemsInOrder', { count }) : t('emptyDescription')}
            </SheetDescription>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--menu-line-strong)] bg-[var(--menu-paper)]">
                <ShoppingBag className="h-6 w-6 text-[var(--menu-gold)]" aria-hidden="true" />
              </span>
              <p className="font-heading text-base font-semibold">{t('empty')}</p>
              <p className="max-w-[32ch] text-sm text-[var(--menu-ink-soft)]">
                {t('emptyDescription')}
              </p>
              <Button
                variant="outline"
                className="mt-1 h-11 rounded-full px-6"
                onClick={() => onOpenChange(false)}
              >
                {t('browseMenu')}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {pricedItems.map((item) => {
                  const name = getName(locale, item.name_en, item.name_ar);
                  const lineTotal = item.unitPrice * item.quantity;
                  return (
                    <div
                      key={item.id}
                      className="flex gap-3 border-b border-[var(--menu-line)] py-3.5 last:border-0"
                      data-testid="cart-line"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--menu-paper-deep)]">
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
                          <div className="font-heading flex h-full items-center justify-center text-lg text-[var(--menu-gold-faint)]">
                            {name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--menu-ink)]">
                              {name}
                            </p>
                            <p
                              className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--menu-wine)]"
                              dir="ltr"
                            >
                              {formatCurrencyAmount(lineTotal, currency, {
                                locale: currencyLocale,
                              })}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--menu-ink-soft)] transition-colors hover:bg-[var(--menu-gold-wash)] hover:text-[var(--menu-wine)]"
                            onClick={() => removeItem(item.id)}
                            aria-label={t('removeItem')}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <div
                            className="inline-flex items-stretch overflow-hidden rounded-full border border-[var(--menu-line-strong)]"
                            role="group"
                            aria-label={t('quantity')}
                          >
                            <button
                              type="button"
                              className={stepperButton}
                              onClick={() => updateQty(item.id, item.quantity - 1)}
                              aria-label={t('decreaseQty')}
                            >
                              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <span
                              className="flex min-w-7 items-center justify-center text-sm font-medium tabular-nums"
                              aria-live="polite"
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              className={stepperButton}
                              onClick={() => updateQty(item.id, item.quantity + 1)}
                              aria-label={t('increaseQty')}
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-2">
                          <Label htmlFor={`notes-${item.id}`} className="sr-only">
                            {t('editNotes')}
                          </Label>
                          <Input
                            id={`notes-${item.id}`}
                            value={item.notes}
                            maxLength={settings?.max_order_notes_length ?? 200}
                            placeholder={t('itemNotesPlaceholder')}
                            onChange={(e) => setItemNotes(item.id, e.target.value)}
                            className="h-9 rounded-lg bg-[var(--menu-paper)] text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-[var(--menu-line)] bg-[var(--menu-paper)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-[var(--menu-ink-soft)]">{t('subtotal')}</span>
                  <span
                    className="font-heading text-lg font-semibold tabular-nums text-[var(--menu-wine)]"
                    dir="ltr"
                  >
                    {formatCurrencyAmount(totals.subtotal, currency, { locale: currencyLocale })}
                  </span>
                </div>
                <Button
                  className="h-12 w-full rounded-full bg-[var(--menu-wine)] text-sm font-semibold text-[#FDF7F0] hover:bg-[var(--menu-wine-deep)]"
                  onClick={handleCheckout}
                  data-testid="cart-checkout"
                >
                  {t('checkout')}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
