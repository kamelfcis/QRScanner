'use client';

import { Globe, MessageCircle, ShoppingBag, Utensils } from 'lucide-react';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { localeNames, locales, type Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

interface MenuUtilityBarProps {
  tableParam: string | null;
  whatsapp?: string | null;
  diningMode: 'dining' | 'takeaway';
  onDiningModeChange: (mode: 'dining' | 'takeaway') => void;
}

const MODES = [
  { value: 'dining', icon: Utensils },
  { value: 'takeaway', icon: ShoppingBag },
] as const;

/**
 * Quiet secondary row under the hero. Dining mode changes the prices, so it
 * stays a labelled two-segment control rather than a mystery toggle — but it
 * is set once, so it does not need to occupy the sticky header.
 */
export function MenuUtilityBar({
  tableParam,
  whatsapp,
  diningMode,
  onDiningModeChange,
}: MenuUtilityBarProps) {
  const { locale, setLocale } = useI18n();
  const t = useTranslations('menu');

  const nextLocale: Locale = locales[(locales.indexOf(locale) + 1) % locales.length];
  const phone = whatsapp?.replace(/[^0-9]/g, '');
  const waiterMessage = tableParam
    ? encodeURIComponent(
        locale === 'ar'
          ? `مرحباً، أحتاج مساعدة في الطاولة رقم ${tableParam}`
          : `Hello, I need assistance at table ${tableParam}`
      )
    : '';

  return (
    <div className="border-aklet-line/60 bg-aklet-paper border-b">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:px-5">
        <div
          className="border-aklet-line/80 bg-aklet-paper-soft inline-flex items-center rounded-full border p-0.5"
          role="group"
          aria-label={t('diningMode')}
        >
          {MODES.map(({ value, icon: Icon }) => {
            const active = diningMode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onDiningModeChange(value)}
                aria-pressed={active}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                  active
                    ? 'bg-aklet-ink text-aklet-paper'
                    : 'text-aklet-ink-soft hover:text-aklet-ink'
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {t(value)}
              </button>
            );
          })}
        </div>

        <div className="ms-auto flex items-center gap-1">
          {phone && tableParam ? (
            <a
              href={`https://wa.me/${phone}?text=${waiterMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('callWaiter')}
              className="text-aklet-ink-soft hover:text-aklet-ocean hover:bg-aklet-sand/60 inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t('callWaiter')}</span>
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => setLocale(nextLocale)}
            aria-label={`${locale === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'} (${localeNames[locale]})`}
            className="text-aklet-ink-soft hover:text-aklet-ink hover:bg-aklet-sand/60 inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold uppercase tracking-wide transition-colors"
          >
            <Globe className="h-4 w-4" aria-hidden />
            {nextLocale}
          </button>
        </div>
      </div>
    </div>
  );
}
