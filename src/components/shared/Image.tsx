'use client';

import { useState } from 'react';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  showFallback?: boolean;
}

export function Image({
  src,
  alt,
  width,
  height,
  fill = false,
  sizes,
  priority = false,
  className,
  containerClassName,
  showFallback = true,
}: ImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error && showFallback) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted',
          containerClassName
        )}
      >
        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      {loading && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
      <NextImage
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes || (fill ? '100vw' : undefined)}
        priority={priority}
        className={cn(
          'transition-opacity duration-300',
          loading ? 'opacity-0' : 'opacity-100',
          className
        )}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
}
