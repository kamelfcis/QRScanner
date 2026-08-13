'use client';

import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { customerLogoFallbackLetter, getCustomerFaviconUrls } from '@/lib/engaz/customer-logo';
import { cn } from '@/lib/utils';

type CustomerLogoProps = {
  productionUrl: string | null;
  displayName: string;
  logoUrl?: string | null;
  size?: 'default' | 'sm' | 'lg' | 'xl' | '2xl';
};

export function CustomerLogo({
  productionUrl,
  displayName,
  logoUrl,
  size = 'sm',
}: CustomerLogoProps) {
  const candidates = useMemo(() => {
    const favicons = getCustomerFaviconUrls(productionUrl);
    return logoUrl ? [logoUrl, ...favicons] : favicons;
  }, [logoUrl, productionUrl]);
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
        <AvatarFallback className={cn(size === '2xl' && 'text-2xl', size === 'xl' && 'text-lg')}>
          {customerLogoFallbackLetter(displayName)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
