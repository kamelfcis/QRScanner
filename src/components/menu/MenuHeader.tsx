'use client';

import NextImage from 'next/image';
import { Languages, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getName } from '@/lib/utils';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';

interface MenuHeaderProps {
  tableParam: string | null;
}

/**
 * Short market header: identity only. Search, categories and cart live in the
 * sticky toolbar below so the brand bar can scroll away.
 */
export function MenuHeader({ tableParam }: MenuHeaderProps) {
  const { data: settings } = useRestaurantSettings();
  const prefersReducedMotion = useReducedMotion();
  const { locale, setLocale } = useI18n();
  const t = useTranslations('menu');
  const tCommon = useTranslations('common');

  const name = getName(
    locale,
    settings?.name_en || tCommon('appName'),
    settings?.name_ar || tCommon('appName')
  );
  const subtitle =
    settings?.hero_subtitle?.trim() || settings?.tagline?.trim() || t('marketTagline');

  const whatsapp = settings?.whatsapp?.replace(/[^0-9]/g, '');
  const inquiryMessage = encodeURIComponent(
    locale === 'ar'
      ? 'مرحباً، أرغب في الاستفسار عن منتجات الجملة'
      : 'Hello, I would like to ask about wholesale products'
  );

  return (
    <motion.header
      initial={prefersReducedMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="border-b border-[var(--hm-line)] bg-[var(--hm-surface)] pt-[env(safe-area-inset-top)]"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
        {settings?.logo_url ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[var(--hm-radius-sm)] border border-[var(--hm-line)] bg-white p-1">
            <NextImage
              src={settings.logo_url}
              alt={name}
              width={44}
              height={44}
              className="h-full w-full object-contain"
              priority
            />
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-heading truncate text-[15px] font-bold leading-tight text-[var(--hm-ink)] sm:text-lg">
              {name}
            </h1>
            {tableParam && (
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {t('tableNumber', { number: tableParam })}
              </Badge>
            )}
          </div>
          <p className="truncate text-[11px] leading-snug text-[var(--hm-ink-soft)] sm:text-xs">
            {subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}?text=${inquiryMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--hm-radius-sm)] text-[#128C4A] transition-colors hover:bg-[var(--hm-surface-muted)]"
              aria-label={t('contactSales')}
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </a>
          )}

          <button
            type="button"
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            className="inline-flex h-10 items-center gap-1.5 rounded-[var(--hm-radius-sm)] px-2.5 text-xs font-semibold text-[var(--hm-ink-soft)] transition-colors hover:bg-[var(--hm-surface-muted)] hover:text-[var(--hm-ink)]"
            aria-label={t('switchLanguage')}
          >
            <Languages className="h-4 w-4" aria-hidden="true" />
            {locale === 'ar' ? 'EN' : 'ع'}
          </button>
        </div>
      </div>
    </motion.header>
  );
}
