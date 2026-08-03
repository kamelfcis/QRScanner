'use client';

import { useLocale } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon' | 'icon-sm';
}

export function LanguageSwitcher({ className, variant = 'ghost', size = 'sm' }: LanguageSwitcherProps) {
  const { locale, setLocale, localeNames, locales } = useLocale();

  const toggleLocale = () => {
    const nextIndex = (locales.indexOf(locale) + 1) % locales.length;
    setLocale(locales[nextIndex]);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleLocale}
      className={cn('gap-1.5', className)}
      aria-label={`Switch language (current: ${localeNames[locale]})`}
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">{localeNames[locale]}</span>
    </Button>
  );
}
