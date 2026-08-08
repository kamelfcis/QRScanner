'use client';

import Link from 'next/link';
import { Phone, MapPin, Camera, Globe, Smartphone, MessageCircle, Mail } from 'lucide-react';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { resolveContactAddress } from '@/lib/contact/defaults';

export function PublicFooter() {
  const { data: settings } = useRestaurantSettings();
  const { locale } = useI18n();
  const t = useTranslations('landing');
  const navT = useTranslations('nav');
  const commonT = useTranslations('common');

  const name = settings?.name_en || commonT('appName');
  const address = resolveContactAddress(settings, locale);

  return (
    <footer className="bg-muted/50 border-border/60 dark:bg-muted/25 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              {settings?.logo_url && (
                <img src={settings.logo_url} alt={name} className="h-10 w-auto object-contain" />
              )}
              <h3 className="text-primary font-heading text-lg font-bold">{name}</h3>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">{t('premiumDining')}</p>
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
                <Link href="/welcome" className="text-muted-foreground hover:text-primary text-sm">
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
                  <Camera className="h-5 w-5" />
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
                  <Globe className="h-5 w-5" />
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
                  <Smartphone className="h-5 w-5" />
                </a>
              )}
              {settings?.whatsapp && (
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={t('whatsapp')}
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-8">
          <p className="text-muted-foreground text-center text-sm">
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
