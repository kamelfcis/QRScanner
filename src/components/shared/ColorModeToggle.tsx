'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { useAkColorMode } from '@/components/providers/AkColorModeProvider';
import { isAlaKeefakTenant } from '@/i18n/config';
import { cn } from '@/lib/utils';

export function ColorModeToggle({
  className,
  variant = 'ghost',
}: {
  className?: string;
  variant?: 'ghost' | 'outline';
}) {
  const { colorMode, toggleColorMode } = useAkColorMode();
  const accessibilityT = useTranslations('accessibility');

  if (!isAlaKeefakTenant) return null;

  const isDark = colorMode === 'dark';

  return (
    <Button
      type="button"
      variant={variant}
      size="icon-sm"
      onClick={toggleColorMode}
      className={cn('size-11 shrink-0 md:size-7', className)}
      aria-label={accessibilityT('toggleTheme')}
      aria-pressed={!isDark}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
