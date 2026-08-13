'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { applyTheme, getStoredTheme, type Theme } from '@/lib/theme';

export function ThemeToggle() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="text-muted-foreground hover:text-foreground rounded-md p-1.5"
      aria-label={theme === 'dark' ? t.theme.toLight : t.theme.toDark}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
