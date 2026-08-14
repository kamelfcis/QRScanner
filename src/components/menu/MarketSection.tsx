'use client';

import type { LucideIcon } from 'lucide-react';
import { MotionSection } from '@/components/shared/motion';
import { cn } from '@/lib/utils';

interface MarketSectionProps {
  id?: string;
  title: string;
  description?: string | null;
  count?: number;
  countLabel?: string;
  icon?: LucideIcon;
  /** Spare produce treatment — fruits & vegetables only. */
  fresh?: boolean;
  children: React.ReactNode;
}

export function MarketSection({
  id,
  title,
  description,
  count,
  countLabel,
  icon: Icon,
  fresh = false,
  children,
}: MarketSectionProps) {
  return (
    <MotionSection
      className={cn(
        'mb-4 rounded-[var(--hm-radius)] px-2.5 py-3 sm:mb-6 sm:px-3 sm:py-4',
        fresh
          ? 'border border-[var(--hm-fresh-line)] bg-[var(--hm-fresh-surface)]'
          : 'border border-transparent'
      )}
    >
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:mb-3">
        <h2
          id={id}
          className="font-heading flex items-center gap-2 text-base font-bold text-[var(--hm-ink)] sm:text-lg"
        >
          {Icon ? (
            <Icon
              className={cn(
                'h-4.5 w-4.5 shrink-0',
                fresh ? 'text-[var(--hm-fresh)]' : 'text-[var(--hm-primary)]'
              )}
              aria-hidden="true"
            />
          ) : null}
          {title}
        </h2>
        {typeof count === 'number' && countLabel ? (
          <span className="text-[11px] tabular-nums text-[var(--hm-ink-faint)]">{countLabel}</span>
        ) : null}
        {description ? (
          <p className="w-full text-xs text-[var(--hm-ink-soft)]">{description}</p>
        ) : null}
      </div>
      {children}
    </MotionSection>
  );
}
