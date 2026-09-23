'use client';

import { Search } from 'lucide-react';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { DiningModeToggle } from '@/components/menu/DiningModeToggle';
import { MenuContactButtons } from '@/components/menu/MenuContactButtons';
import { useTranslations } from '@/components/providers/RootI18nProvider';

interface MenuUtilityBarProps {
  tableParam: string | null;
  diningMode: 'dining' | 'takeaway';
  onDiningModeChange: (mode: 'dining' | 'takeaway') => void;
  onSearchOpen: () => void;
}

export function MenuUtilityBar({
  tableParam,
  diningMode,
  onDiningModeChange,
  onSearchOpen,
}: MenuUtilityBarProps) {
  const t = useTranslations('menu');

  return (
    <div className="border-b border-[var(--menu-line)] bg-[var(--menu-paper)] sm:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5">
        <DiningModeToggle value={diningMode} onChange={onDiningModeChange} />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSearchOpen}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--menu-ink)] transition-colors hover:bg-[var(--menu-gold-wash)]"
            aria-label={t('searchMenu')}
          >
            <Search className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <MenuContactButtons tableParam={tableParam} />
          <LanguageSwitcher
            variant="ghost"
            className="size-11 rounded-full bg-[var(--menu-gold-wash)] text-[var(--menu-gold)] hover:bg-[rgba(184,147,74,0.2)] hover:text-[var(--menu-gold-soft)]"
          />
        </div>
      </div>
    </div>
  );
}
