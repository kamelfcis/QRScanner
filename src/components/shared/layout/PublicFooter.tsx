'use client';

import Link from 'next/link';
import { Phone, MapPin, Mail } from 'lucide-react';
import { BrandSocialIcon } from '@/components/shared/BrandSocialIcon';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getRestaurantDisplayName } from '@/lib/appName';
import { resolveContactAddress } from '@/lib/contact/defaults';
import { buildCustomerWhatsAppUrl } from '@/lib/phone/normalize';
import { isAlaKeefakTenant } from '@/i18n/config';

export function PublicFooter() {
  const { data: settings } = useRestaurantSettings();
  const { locale } = useI18n();
  const t = useTranslations('landing');
  const navT = useTranslations('nav');

  const name = getRestaurantDisplayName(locale, settings);
  const address = resolveContactAddress(settings, locale);
  const whatsappHref = settings?.whatsapp ? buildCustomerWhatsAppUrl(settings.whatsapp) : '';
  const tagline = settings?.tagline?.trim() || t('premiumDining');

  return (
    <footer
      className={
        isAlaKeefakTenant ? 'border-t border-white/10 bg-[#080808]' : 'bg-muted/50 border-t'
      }
    >
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              {settings?.logo_url && (
                <img src={settings.logo_url} alt={name} className="h-8 w-auto object-contain" />
              )}
              <h3 className="text-primary font-heading text-lg font-bold">{name}</h3>
            </div>
            {isAlaKeefakTenant ? <span className="ember-line mt-3 w-16" aria-hidden /> : null}
            <p className="text-muted-foreground mt-2 text-sm">{tagline}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold">{t('quickLinks')}</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-primary text-sm">
                  {navT('home')}
                </Link>
              </li>
              <li>
                <Link
                  href={isAlaKeefakTenant ? '/menu' : '/welcome'}
                  className="text-muted-foreground hover:text-primary text-sm"
                >
                  {navT('menu')}
                </Link>
              </li>
              <li>
                <Link href="#story" className="text-muted-foreground hover:text-primary text-sm">
                  {t('ourStory')}
                </Link>
              </li>
              <li>
                <Link href="#contact" className="text-muted-foreground hover:text-primary text-sm">
                  {navT('contact')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">{t('contactInfo')}</h4>
            <ul className="mt-3 space-y-2">
              {settings?.phone && (
                <li>
                  <a
                    href={`tel:${settings.phone}`}
                    className="text-muted-foreground hover:text-primary flex items-center gap-2 text-sm"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span dir="ltr" className="unicode-bidi-plaintext">
                      {settings.phone}
                    </span>
                  </a>
                </li>
              )}
              {settings?.email && (
                <li>
                  <a
                    href={`mailto:${settings.email}`}
                    className="text-muted-foreground hover:text-primary flex items-center gap-2 text-sm"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span dir="ltr" className="unicode-bidi-plaintext">
                      {settings.email}
                    </span>
                  </a>
                </li>
              )}
              <li className="text-muted-foreground flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                {address}
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">{t('followUs')}</h4>
            <div className="mt-3 flex gap-3">
              {settings?.instagram && (
                <a
                  href={`https://instagram.com/${settings.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={t('instagram')}
                >
                  <BrandSocialIcon brand="instagram" />
                </a>
              )}
              {settings?.facebook && (
                <a
                  href={
                    settings.facebook.startsWith('http')
                      ? settings.facebook
                      : `https://facebook.com/${settings.facebook}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={t('facebook')}
                >
                  <BrandSocialIcon brand="facebook" />
                </a>
              )}
              {settings?.tiktok && (
                <a
                  href={`https://tiktok.com/@${settings.tiktok.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={t('tiktok')}
                >
                  <BrandSocialIcon brand="tiktok" />
                </a>
              )}
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={t('whatsapp')}
                >
                  <BrandSocialIcon brand="whatsapp" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-8">
          <p className="text-muted-foreground text-center text-sm">
            {t('copyright', { year: new Date().getFullYear(), name })}
          </p>
        </div>
      </div>
    </footer>
  );
}
