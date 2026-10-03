'use client';

import NextImage from 'next/image';
import Link from 'next/link';
import { Phone, MessageCircle, UtensilsCrossed } from 'lucide-react';
import { SiFacebook, SiInstagram, SiTiktok } from 'react-icons/si';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getMenuEntryPath } from '@/lib/store-config';
import { resolveSocialUrl } from '@/lib/link-page/social-url';
import { buildCustomerWhatsAppUrl, buildTelUri } from '@/lib/phone/normalize';
import type { LinkPageOverlayStrength, LinkPageSettings, RestaurantSettings } from '@/types';
import { cn } from '@/lib/utils';

interface LinkPageViewProps {
  settings: LinkPageSettings;
  restaurant?: RestaurantSettings | null;
  className?: string;
  /** Editor preview: skip scan pulse and entrance motion. */
  preview?: boolean;
}

type LinkKey = keyof LinkPageSettings['links'];

const PRIMARY_KEYS = ['menu', 'phone', 'whatsapp'] as const;
const SOCIAL_KEYS = ['facebook', 'instagram', 'tiktok'] as const;

const OVERLAY: Record<LinkPageOverlayStrength, string> = {
  soft: 'from-[#06141f]/50 via-[#071820]/45 to-[#06141f]/75 dark:from-[#02080d]/45 dark:via-[#041018]/50 dark:to-[#02080d]/80',
  medium:
    'from-[#06141f]/70 via-[#071820]/62 to-[#06141f]/88 dark:from-[#02080d]/65 dark:via-[#041018]/70 dark:to-[#02080d]/92',
  strong:
    'from-[#06141f]/84 via-[#071820]/80 to-[#06141f]/94 dark:from-[#02080d]/80 dark:via-[#041018]/86 dark:to-[#02080d]/96',
};

const SOCIAL_ICON: Record<(typeof SOCIAL_KEYS)[number], { className: string; labelKey: LinkKey }> =
  {
    facebook: { className: 'text-[#1877F2]', labelKey: 'facebook' },
    instagram: { className: 'text-[#E4405F]', labelKey: 'instagram' },
    tiktok: { className: 'text-white', labelKey: 'tiktok' },
  };

export function LinkPageView({
  settings,
  restaurant,
  className,
  preview = false,
}: LinkPageViewProps) {
  const { locale, dir } = useI18n();
  const t = useTranslations('linkPage');
  const prefersReducedMotion = useReducedMotion();

  const title = locale === 'ar' ? settings.title_ar : settings.title_en;
  const subtitle = locale === 'ar' ? settings.subtitle_ar : settings.subtitle_en;
  const logoUrl = settings.logo_url || restaurant?.logo_url || null;
  const radiusClass = settings.button_radius === 'pill' ? 'rounded-full' : 'rounded-xl';
  const overlayStrength = settings.overlay_strength ?? 'medium';
  const useHero = settings.use_hero_background !== false;
  const heroUrl = useHero ? restaurant?.hero_image_url?.trim() || null : null;
  const motionOn = settings.motion_enabled !== false && !preview && !prefersReducedMotion;

  const primaryLinks = PRIMARY_KEYS.filter((key) => settings.links[key].enabled);
  const socialLinks = SOCIAL_KEYS.filter((key) => settings.links[key].enabled);

  function renderPrimaryIcon(key: (typeof PRIMARY_KEYS)[number]) {
    switch (key) {
      case 'phone':
        return <Phone className="h-5 w-5 shrink-0" aria-hidden />;
      case 'whatsapp':
        return <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />;
      case 'menu':
        return <UtensilsCrossed className="h-5 w-5 shrink-0" aria-hidden />;
    }
  }

  function renderSocialIcon(key: (typeof SOCIAL_KEYS)[number]) {
    switch (key) {
      case 'facebook':
        return <SiFacebook className="h-6 w-6" aria-hidden />;
      case 'instagram':
        return <SiInstagram className="h-6 w-6" aria-hidden />;
      case 'tiktok':
        return <SiTiktok className="h-6 w-6" aria-hidden />;
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

  function getPrimaryLabel(key: (typeof PRIMARY_KEYS)[number]): string {
    switch (key) {
      case 'phone':
        return t('callUs');
      case 'whatsapp':
        return t('whatsapp');
      case 'menu':
        return t('viewMenu');
    }
  }

  let enterIndex = 0;

  return (
    <div
      dir={dir}
      className={cn(
        'relative isolate flex min-h-full flex-col items-center overflow-hidden px-4 py-10',
        !preview && 'min-h-screen',
        className
      )}
      style={{ backgroundColor: settings.background }}
    >
      {heroUrl ? (
        <NextImage
          src={heroUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="pointer-events-none -z-20 object-cover object-center"
        />
      ) : null}

      <div
        className={cn(
          'pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b',
          OVERLAY[overlayStrength]
        )}
        aria-hidden
      />

      <div className="flex w-full max-w-md flex-col items-center">
        <div className="w-full rounded-3xl border border-white/15 bg-black/35 px-5 py-8 shadow-2xl backdrop-blur-xl dark:bg-black/45">
          <div className="flex flex-col items-center gap-6">
            {logoUrl ? (
              <div
                className={cn(
                  'relative',
                  motionOn && 'link-page-enter',
                  motionOn && `link-page-enter-${Math.min(enterIndex++, 7)}`
                )}
              >
                <div
                  className="absolute -inset-1 rounded-full bg-teal-300/35 blur-md"
                  aria-hidden
                />
                <NextImage
                  src={logoUrl}
                  alt={title}
                  width={96}
                  height={96}
                  className="relative h-24 w-24 rounded-full object-cover ring-1 ring-white/70"
                  priority
                />
              </div>
            ) : null}

            <div
              className={cn(
                'space-y-2 text-center',
                motionOn && 'link-page-enter',
                motionOn && `link-page-enter-${Math.min(enterIndex++, 7)}`
              )}
            >
              <h1 className="font-heading text-2xl font-bold text-white">{title}</h1>
              {subtitle ? <p className="text-sm text-white/70">{subtitle}</p> : null}
            </div>

            <nav aria-label={t('followUs')} className="flex w-full flex-col gap-3">
              {primaryLinks.map((key) => {
                const href = getHref(key);
                if (!href || href === '#') return null;

                const delayClass = motionOn
                  ? `link-page-enter link-page-enter-${Math.min(enterIndex++, 7)}`
                  : '';
                const buttonClass = cn(
                  'flex w-full items-center justify-center gap-3 px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0',
                  radiusClass,
                  delayClass
                );
                const style = { backgroundColor: settings.button_color };

                if (key === 'menu') {
                  return (
                    <Link key={key} href={href} className={buttonClass} style={style}>
                      {renderPrimaryIcon(key)}
                      <span>{getPrimaryLabel(key)}</span>
                    </Link>
                  );
                }

                return (
                  <a key={key} href={href} className={buttonClass} style={style}>
                    {renderPrimaryIcon(key)}
                    <span>{getPrimaryLabel(key)}</span>
                  </a>
                );
              })}
            </nav>

            {socialLinks.length > 0 ? (
              <div className="flex w-full flex-col items-center gap-3">
                <div
                  className={cn(
                    'relative flex items-center justify-center gap-3',
                    motionOn && 'link-page-enter',
                    motionOn && `link-page-enter-${Math.min(enterIndex++, 7)}`
                  )}
                >
                  {socialLinks.map((key) => {
                    const href = getHref(key);
                    if (!href || href === '#') return null;
                    return (
                      <a
                        key={key}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t(SOCIAL_ICON[key].labelKey)}
                        className={cn(
                          'hover:bg-white/16 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0',
                          SOCIAL_ICON[key].className
                        )}
                      >
                        {renderSocialIcon(key)}
                      </a>
                    );
                  })}
                  {motionOn ? <span className="link-scan-pulse" aria-hidden /> : null}
                </div>
                <p className="text-xs text-white/55">{t('followUs')}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
