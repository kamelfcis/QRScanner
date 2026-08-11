'use client';

import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { customerLogoFallbackLetter, getCustomerFaviconUrls } from '@/lib/engaz/customer-logo';
import { cn } from '@/lib/utils';

type CustomerLogoProps = {
  productionUrl: string | null;
  displayName: string;
  size?: 'default' | 'sm' | 'lg';
};

export function CustomerLogo({ productionUrl, displayName, size = 'sm' }: CustomerLogoProps) {
  const candidates = useMemo(() => getCustomerFaviconUrls(productionUrl), [productionUrl]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const src = candidates[candidateIndex] ?? null;

  function handleImageError() {
    setCandidateIndex((index) => index + 1);
  }

  return (
    <Avatar size={size}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className={cn('aspect-square size-full rounded-full object-cover')}
          onError={handleImageError}
        />
      ) : (
        <AvatarFallback>{customerLogoFallbackLetter(displayName)}</AvatarFallback>
      )}
    </Avatar>
  );
}
