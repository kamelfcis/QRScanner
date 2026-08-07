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

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  const t = useTranslations('common');
  const resolvedTitle = title ?? t('noData');
  const resolvedDescription = description ?? t('noDataDescription');
  return (
    <div
      role="status"
      className={cn(
        'bg-muted/30 flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center',
        className
      )}
    >
      {icon || <PackageOpen className="text-muted-foreground/50 h-12 w-12" aria-hidden="true" />}
      <h3 className="font-heading mt-4 text-lg font-semibold">{resolvedTitle}</h3>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">{resolvedDescription}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-6 min-h-11 px-6">
          {action.label}
        </Button>
      )}
    </div>
  );
}
