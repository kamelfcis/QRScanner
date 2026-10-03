'use client';

import NextImage from 'next/image';
import Link from 'next/link';
import { Phone, MessageCircle, UtensilsCrossed } from 'lucide-react';
import { SiFacebook, SiInstagram, SiTiktok } from 'react-icons/si';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getMenuEntryPath } from '@/lib/store-config';
import { resolveSocialUrl } from '@/lib/link-page/social-url';
import { buildCustomerWhatsAppUrl, buildTelUri } from '@/lib/phone/normalize';
import type { LinkPageSettings, RestaurantSettings } from '@/types';
import { cn } from '@/lib/utils';

interface LinkPageViewProps {
  settings: LinkPageSettings;
  restaurant?: RestaurantSettings | null;
  className?: string;
}

type LinkKey = keyof LinkPageSettings['links'];

const SOCIAL_KEYS = ['facebook', 'instagram', 'tiktok'] as const;

export function LinkPageView({ settings, restaurant, className }: LinkPageViewProps) {
  const { locale, dir } = useI18n();
  const t = useTranslations('linkPage');

  const title = locale === 'ar' ? settings.title_ar : settings.title_en;
  const subtitle = locale === 'ar' ? settings.subtitle_ar : settings.subtitle_en;
  const logoUrl = settings.logo_url || restaurant?.logo_url || null;
  const radiusClass = settings.button_radius === 'pill' ? 'rounded-full' : 'rounded-xl';

  const visibleLinks = (Object.keys(settings.links) as LinkKey[]).filter(
    (key) => settings.links[key].enabled
  );

  function renderIcon(key: LinkKey) {
    switch (key) {
      case 'facebook':
        return <SiFacebook className="h-5 w-5 shrink-0" aria-hidden />;
      case 'instagram':
        return <SiInstagram className="h-5 w-5 shrink-0" aria-hidden />;
      case 'tiktok':
        return <SiTiktok className="h-5 w-5 shrink-0" aria-hidden />;
      case 'phone':
        return <Phone className="h-5 w-5 shrink-0" aria-hidden />;
      case 'whatsapp':
        return <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />;
      case 'menu':
        return <UtensilsCrossed className="h-5 w-5 shrink-0" aria-hidden />;
      default:
        return null;
    }
  }

  function getHref(key: LinkKey): string {
    const item = settings.links[key];
    switch (key) {
      case 'facebook':
        return resolveSocialUrl('facebook', item.url);
      case 'instagram':
        return resolveSocialUrl('instagram', item.url);
      case 'tiktok':
        return resolveSocialUrl('tiktok', item.url);
      case 'phone':
        return buildTelUri(item.value || restaurant?.phone || '');
      case 'whatsapp':
        return buildCustomerWhatsAppUrl(item.value || restaurant?.whatsapp || '');
      case 'menu':
        return getMenuEntryPath();
      default:
        return '#';
    }
  }

  function getLabel(key: LinkKey): string {
    switch (key) {
      case 'facebook':
        return t('facebook');
      case 'instagram':
        return t('instagram');
      case 'tiktok':
        return t('tiktok');
      case 'phone':
        return t('callUs');
      case 'whatsapp':
        return t('whatsapp');
      case 'menu':
        return t('viewMenu');
      default:
        return key;
    }
  }

  return (
    <div
      dir={dir}
      className={cn(
        'bg-background text-foreground flex min-h-screen flex-col items-center px-4 py-10',
        className
      )}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        {logoUrl ? (
          <NextImage
            src={logoUrl}
            alt={title}
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover shadow-lg"
            priority
          />
        ) : null}

        <div className="space-y-2 text-center">
          <h1 className="text-foreground text-2xl font-bold">{title}</h1>
          {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
        </div>

        <nav aria-label={t('followUs')} className="flex w-full flex-col gap-3">
          {visibleLinks.map((key) => {
            const href = getHref(key);
            if (!href || href === '#') return null;

            const buttonClass = cn(
              'flex w-full items-center justify-center gap-3 px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]',
              radiusClass
            );
            const style = { backgroundColor: settings.button_color };
            const isSocial = key === 'facebook' || key === 'instagram' || key === 'tiktok';

            if (key === 'menu') {
              return (
                <Link key={key} href={href} className={buttonClass} style={style}>
                  {renderIcon(key)}
                  <span>{getLabel(key)}</span>
                </Link>
              );
            }

            return (
              <a
                key={key}
                href={href}
                {...(isSocial ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={buttonClass}
                style={style}
              >
                {renderIcon(key)}
                <span>{getLabel(key)}</span>
              </a>
            );
          })}
        </nav>

        {SOCIAL_KEYS.some((key) => settings.links[key].enabled) ? (
          <p className="text-muted-foreground text-xs">{t('followUs')}</p>
        ) : null}
      </div>
    </div>
  );
}
