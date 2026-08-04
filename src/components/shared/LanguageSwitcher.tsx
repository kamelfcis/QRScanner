'use client';

import { useI18n } from '@/components/providers/RootI18nProvider';
import { localeNames, locales, type Locale } from '@/i18n/config';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon' | 'icon-sm';
}

export function LanguageSwitcher({ className, variant = 'ghost', size = 'sm' }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();

  const toggleLocale = () => {
    const nextIndex = (locales.indexOf(locale) + 1) % locales.length;
    setLocale(locales[nextIndex]);
  };

  const nextLocale: Locale = locales[(locales.indexOf(locale) + 1) % locales.length];

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleLocale}
      className={cn('gap-1.5', className)}
      aria-label={`${locale === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'} (current: ${localeNames[locale]})`}
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">{localeNames[nextLocale]}</span>
    </Button>
  );
}
