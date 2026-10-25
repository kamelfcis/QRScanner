import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  sm: 'h-4 w-24',
  md: 'h-5 w-28',
  lg: 'h-7 w-36',
  hero: 'h-12 w-48 sm:h-16 sm:w-64 md:h-20',
} as const;

/** Short bar matching the surrounding text size while the site name is unresolved. */
export function BrandNameSkeleton({
  className,
  size,
}: {
  className?: string;
  size?: keyof typeof SIZE_CLASS;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block max-w-full animate-pulse rounded-md bg-current/25 align-middle',
        size ? SIZE_CLASS[size] : 'h-[1em] w-[6.5ch]',
        className
      )}
    />
  );
}
