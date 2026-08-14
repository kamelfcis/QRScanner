'use client';

import { ShoppingBag, Utensils } from 'lucide-react';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';

interface DiningModeToggleProps {
  value: 'dining' | 'takeaway';
  onChange: (mode: 'dining' | 'takeaway') => void;
  className?: string;
  /** Compact drops the labels and keeps icons only (header on desktop) */
  compact?: boolean;
}

export function DiningModeToggle({
  value,
  onChange,
  className,
  compact = false,
}: DiningModeToggleProps) {
  const t = useTranslations('menu');

  const options = [
    { key: 'dining' as const, icon: Utensils, label: t('dining') },
    { key: 'takeaway' as const, icon: ShoppingBag, label: t('takeaway') },
  ];

  return (
    <div
      role="group"
      aria-label={t('diningMode')}
      className={cn(
        'inline-flex items-center rounded-full border border-[var(--menu-line-strong)] bg-[var(--menu-surface)] p-0.5',
        className
      )}
    >
      {options.map(({ key, icon: Icon, label }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={active}
            aria-label={label}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors',
              compact ? 'h-9 min-w-9 px-2.5' : 'h-9 px-3.5',
              active
                ? 'bg-[var(--menu-wine)] text-[#FDF7F0]'
                : 'text-[var(--menu-ink-soft)] hover:text-[var(--menu-ink)]'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
