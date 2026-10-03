'use client';

import { UtensilsCrossed } from 'lucide-react';
import { Image } from '@/components/shared/Image';
import { cn } from '@/lib/utils';

export const MAX_ITEM_THUMBS = 4;

export function ItemPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-muted flex shrink-0 items-center justify-center rounded-lg border',
        className
      )}
    >
      <UtensilsCrossed className="text-muted-foreground/50 h-4 w-4" aria-hidden="true" />
    </div>
  );
}

export function ItemThumb({
  imageUrl,
  alt,
  size,
  className,
}: {
  imageUrl: string | null | undefined;
  alt: string;
  size: 'sm' | 'md';
  className?: string;
}) {
  const dim = size === 'sm' ? 'size-11' : 'size-12';
  if (!imageUrl) {
    return <ItemPlaceholder className={cn(dim, className)} />;
  }
  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={size === 'sm' ? 44 : 48}
      height={size === 'sm' ? 44 : 48}
      sizes={size === 'sm' ? '44px' : '48px'}
      className={cn('rounded-lg object-cover', dim, className)}
      containerClassName={cn('shrink-0 rounded-lg', dim, className)}
    />
  );
}
