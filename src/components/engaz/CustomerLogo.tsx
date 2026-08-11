'use client';

import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { customerLogoFallbackLetter, getCustomerFaviconUrls } from '@/lib/engaz/customer-logo';

type CustomerLogoProps = {
  productionUrl: string | null;
  displayName: string;
  size?: 'default' | 'sm' | 'lg';
};

export function CustomerLogo({ productionUrl, displayName, size = 'sm' }: CustomerLogoProps) {
  const { direct, google } = useMemo(() => getCustomerFaviconUrls(productionUrl), [productionUrl]);
  const [stage, setStage] = useState<'direct' | 'google' | 'fallback'>(() =>
    direct ? 'direct' : google ? 'google' : 'fallback'
  );

  const src = stage === 'direct' ? direct : stage === 'google' ? google : null;

  function handleImageError() {
    if (stage === 'direct' && google) {
      setStage('google');
      return;
    }
    setStage('fallback');
  }

  return (
    <Avatar size={size}>
      {src ? <AvatarImage src={src} alt="" onError={handleImageError} /> : null}
      <AvatarFallback>{customerLogoFallbackLetter(displayName)}</AvatarFallback>
    </Avatar>
  );
}
