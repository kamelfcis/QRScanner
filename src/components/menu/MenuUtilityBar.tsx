'use client';

import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { DiningModeToggle } from '@/components/menu/DiningModeToggle';
import { MenuContactButtons } from '@/components/menu/MenuContactButtons';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { resolveOrderModes } from '@/lib/order/order-modes';

interface MenuUtilityBarProps {
  tableParam: string | null;
  diningMode: 'dining' | 'takeaway';
  onDiningModeChange: (mode: 'dining' | 'takeaway') => void;
}

/**
 * Phone-only strip carrying the controls that live in the header on desktop,
 * so the sticky header can stay a fixed 56px.
 */
export function MenuUtilityBar({
  tableParam,
  diningMode,
  onDiningModeChange,
}: MenuUtilityBarProps) {
  const { data: settings } = useRestaurantSettings();
  const orderModes = resolveOrderModes(settings);
  const showDiningToggle = orderModes.dineIn;

  return (
    <div className="border-b border-[var(--menu-line)] bg-[var(--menu-paper)] sm:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5">
        {showDiningToggle ? (
          <DiningModeToggle value={diningMode} onChange={onDiningModeChange} />
        ) : (
          <span aria-hidden className="h-11" />
        )}

        <div className="flex items-center gap-1">
          <MenuContactButtons
            tableParam={tableParam}
            buttonClassName="text-[var(--menu-ink-soft)] hover:text-[var(--menu-ink)]"
          />
          <LanguageSwitcher
            variant="ghost"
            className="size-11 rounded-full text-[var(--menu-ink-soft)] hover:text-[var(--menu-ink)]"
          />
        </div>
      </div>
    </div>
  );
}
