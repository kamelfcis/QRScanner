import { cn } from '@/lib/utils';

export function CompareBadge({
  value,
  vsLabel,
  noCompareLabel,
}: {
  value: number | null;
  vsLabel: string;
  noCompareLabel: string;
}) {
  if (value === null) {
    return <span className="text-muted-foreground text-xs">{noCompareLabel}</span>;
  }
  const positive = value >= 0;
  return (
    <span
      className={cn(
        'text-xs font-medium tabular-nums',
        positive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
      )}
    >
      {positive ? '+' : ''}
      {value.toFixed(1)}% {vsLabel}
    </span>
  );
}
