'use client';

import { cn } from '@/lib/utils';
import { PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/components/providers/RootI18nProvider';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const t = useTranslations('common');
  const resolvedTitle = title ?? t('noData');
  const resolvedDescription = description ?? t('noDataDescription');
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center',
        className
      )}
    >
      {icon || <PackageOpen className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />}
      <h3 className="mt-4 text-lg font-semibold">{resolvedTitle}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{resolvedDescription}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
