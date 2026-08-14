'use client';

import NextImage from 'next/image';
import { useI18n } from '@/components/providers/RootI18nProvider';
import type { LoginBrandConfig } from '@/lib/login/types';

interface LoginBrandPanelProps {
  brand: LoginBrandConfig;
  variant?: 'panel' | 'compact';
}

export function LoginBrandPanel({ brand, variant = 'panel' }: LoginBrandPanelProps) {
  const { locale } = useI18n();
  const name = locale === 'ar' ? brand.nameAr : brand.nameEn;
  const tagline = locale === 'ar' ? brand.taglineAr : brand.taglineEn;
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
          <p className="login-eyebrow">{tagline}</p>
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
        <p className="login-eyebrow">{tagline}</p>
        <p className="login-lockup-name">{name}</p>
      </div>
    </aside>
  );
}
