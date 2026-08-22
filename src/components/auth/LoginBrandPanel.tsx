'use client';

import NextImage from 'next/image';
import { useI18n } from '@/components/providers/RootI18nProvider';
import type { LoginBrandConfig } from '@/lib/login/types';
import { getLocalizedText } from '@/lib/utils';

interface LoginBrandPanelProps {
  brand: LoginBrandConfig;
  variant?: 'panel' | 'compact';
}

export function LoginBrandPanel({ brand, variant = 'panel' }: LoginBrandPanelProps) {
  const { locale } = useI18n();
  const name = getLocalizedText(locale, { en: brand.nameEn, ar: brand.nameAr });
  const tagline = getLocalizedText(locale, { en: brand.taglineEn, ar: brand.taglineAr });
  const showHero = Boolean(brand.heroImageUrl) && variant === 'panel';

  if (variant === 'compact') {
    return (
      <header className="login-compact-brand">
        {brand.logoUrl ? (
          <NextImage
            src={brand.logoUrl}
            alt=""
            width={48}
            height={48}
            className="login-compact-logo"
            priority
          />
        ) : null}
        <div className="login-compact-copy">
          {tagline ? <p className="login-eyebrow">{tagline}</p> : null}
          <p className="login-compact-name">{name}</p>
        </div>
      </header>
    );
  }

  return (
    <aside className="login-brand-panel" aria-hidden="false">
      {showHero ? (
        <NextImage
          src={brand.heroImageUrl!}
          alt=""
          fill
          sizes="(min-width: 1280px) 54vw, 40vw"
          className="login-brand-hero"
          priority
        />
      ) : null}
      <div className="login-brand-wash" />
      <div className="login-brand-lockup">
        {brand.logoUrl ? (
          <NextImage
            src={brand.logoUrl}
            alt=""
            width={96}
            height={96}
            className="login-brand-logo"
            priority
          />
        ) : null}
        {tagline ? <p className="login-eyebrow">{tagline}</p> : null}
        <p className="login-lockup-name">{name}</p>
      </div>
    </aside>
  );
}
