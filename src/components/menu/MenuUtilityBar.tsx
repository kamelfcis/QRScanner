'use client';

import { Search } from 'lucide-react';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { DiningModeToggle } from '@/components/menu/DiningModeToggle';
import { MenuContactButtons } from '@/components/menu/MenuContactButtons';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { resolveOrderModes } from '@/lib/order/order-modes';

interface MenuUtilityBarProps {
  tableParam: string | null;
  diningMode: 'dining' | 'takeaway';
  onDiningModeChange: (mode: 'dining' | 'takeaway') => void;
  onSearchOpen: () => void;
}

/**
 * Phone-only strip carrying the controls that live in the header on desktop,
 * so the sticky header can stay a fixed 56px.
 */
export function MenuUtilityBar({
  tableParam,
  diningMode,
  onDiningModeChange,
  onSearchOpen,
}: MenuUtilityBarProps) {
  const { data: settings } = useRestaurantSettings();
  const orderModes = resolveOrderModes(settings);
  const showDiningToggle = orderModes.dineIn;
  const t = useTranslations('menu');

  return (
    <div className="border-b border-[var(--menu-line)] bg-[var(--menu-paper)] sm:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5">
        {showDiningToggle ? (
          <DiningModeToggle value={diningMode} onChange={onDiningModeChange} />
        ) : (
          <button
            type="button"
            onClick={onSearchOpen}
            className="inline-flex min-h-11 flex-1 items-center gap-2 rounded-full border border-[var(--menu-line-strong)] bg-[var(--menu-surface)] px-3.5 text-sm text-[var(--menu-ink-soft)] transition-colors hover:bg-[var(--menu-gold-wash)] hover:text-[var(--menu-ink)]"
            aria-label={t('searchMenu')}
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{t('searchPlaceholder')}</span>
          </button>
        )}

        <div className="flex items-center gap-1">
          {showDiningToggle ? (
            <button
              type="button"
              onClick={onSearchOpen}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--menu-ink)] transition-colors hover:bg-[var(--menu-gold-wash)]"
              aria-label={t('searchMenu')}
            >
              <Search className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          ) : null}
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
