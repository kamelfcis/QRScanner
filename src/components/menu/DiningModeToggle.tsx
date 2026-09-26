'use client';

import { ShoppingBag, Truck, Utensils } from 'lucide-react';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import {
  getMenuModeToggleOptions,
  resolveMenuModeToggleSelection,
  type WelcomeCardId,
} from '@/lib/order/order-modes';
import type { OrderModes } from '@/lib/order/order-modes';
import type { FulfillmentType } from '@/stores/cart-store';
import { cn } from '@/lib/utils';

interface DiningModeToggleProps {
  orderModes: OrderModes;
  diningMode: 'dining' | 'takeaway';
  fulfillmentType: FulfillmentType;
  onSelect: (cardId: WelcomeCardId) => void;
  className?: string;
  /** Compact drops the labels and keeps icons only (header on desktop) */
  compact?: boolean;
}

export function DiningModeToggle({
  orderModes,
  diningMode,
  fulfillmentType,
  onSelect,
  className,
  compact = false,
}: DiningModeToggleProps) {
  const { locale } = useI18n();
  const tMenu = useTranslations('menu');
  const tWelcome = useTranslations('welcome');
  const options = getMenuModeToggleOptions(orderModes);
  const active = resolveMenuModeToggleSelection(orderModes, diningMode, fulfillmentType);
  const deliveryLabel = locale === 'ar' ? tWelcome('deliveryAr') : tWelcome('deliveryEn');

  const optionConfig: Record<
    WelcomeCardId,
    { icon: typeof Utensils; label: string; ariaLabel: string }
  > = {
    'dine-in': {
      icon: Utensils,
      label: orderModes.takeaway ? tMenu('dining') : tWelcome('dineIn'),
      ariaLabel: orderModes.takeaway ? tMenu('dining') : tWelcome('dineInAr'),
    },
    takeaway: {
      icon: ShoppingBag,
      label: tMenu('takeaway'),
      ariaLabel: tMenu('takeaway'),
    },
    delivery: {
      icon: Truck,
      label: deliveryLabel,
      ariaLabel: tWelcome('deliveryAr'),
    },
  };

  return (
    <div
      role="group"
      aria-label={tMenu('diningMode')}
      className={cn(
        'inline-flex items-center rounded-full border border-[var(--menu-line-strong)] bg-[var(--menu-surface)] p-0.5',
        className
      )}
    >
      {options.map((key) => {
        const { icon: Icon, label, ariaLabel } = optionConfig[key];
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-pressed={isActive}
            aria-label={ariaLabel}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors',
              compact ? 'h-9 min-w-9 px-2.5' : 'h-9 px-3.5',
              isActive
                ? 'bg-[var(--menu-wine)] text-[var(--menu-on-wine)]'
                : 'text-[var(--menu-ink-soft)] hover:text-[var(--menu-ink)]'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
