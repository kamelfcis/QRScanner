'use client';

import { MessageCircle } from 'lucide-react';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { DiningModeToggle } from '@/components/menu/DiningModeToggle';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';

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
  const { locale } = useI18n();
  const t = useTranslations('menu');

  const whatsapp = settings?.whatsapp?.replace(/[^0-9]/g, '');
  const waiterMessage = tableParam
    ? encodeURIComponent(
        locale === 'ar'
          ? `مرحباً، أحتاج مساعدة في الطاولة رقم ${tableParam}`
          : `Hello, I need assistance at table ${tableParam}`
      )
    : '';

  return (
    <div className="border-b border-[var(--menu-line)] bg-[var(--menu-paper)] sm:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5">
        <DiningModeToggle value={diningMode} onChange={onDiningModeChange} />

        <div className="flex items-center gap-1">
          {whatsapp && tableParam && (
            <a
              href={`https://wa.me/${whatsapp}?text=${waiterMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--menu-ink-soft)] transition-colors hover:bg-[var(--menu-gold-wash)] hover:text-[var(--menu-ink)]"
              aria-label={t('callWaiter')}
            >
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
            </a>
          )}
          <LanguageSwitcher
            variant="ghost"
            className="size-11 rounded-full text-[var(--menu-ink-soft)] hover:text-[var(--menu-ink)]"
          />
        </div>
      </div>
    </div>
  );
}
