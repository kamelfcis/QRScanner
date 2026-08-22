'use client';

import { useI18n } from '@/components/providers/RootI18nProvider';
import { localeFlags, localeNames, enabledLocales, type Locale } from '@/i18n/config';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon' | 'icon-sm';
}

export function LanguageSwitcher({
  className,
  variant = 'ghost',
  size = 'sm',
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant={variant}
            size={size}
            className={cn(
              'size-9 shrink-0 gap-0 px-0 sm:size-auto sm:h-7 sm:gap-2 sm:px-2.5',
              className
            )}
            aria-label={`Switch language (current: ${localeNames[locale]})`}
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{localeNames[locale]}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-40">
        {enabledLocales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => {
              if (loc !== locale) setLocale(loc);
            }}
          >
            <span aria-hidden>{localeFlags[loc]}</span>
            <span>{localeNames[loc]}</span>
            {loc === locale ? <Check className="ml-auto h-4 w-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
