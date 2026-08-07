'use client';

import {
  Phone,
  MapPin,
  MessageCircle,
  Globe,
  Camera,
  Smartphone,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { MotionSection } from '@/components/shared/motion';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { resolveContactAddress, formatWhatsAppUrl, getMapEmbedUrl } from '@/lib/contact/defaults';
import { cn } from '@/lib/utils';

function LtrText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span dir="ltr" className={cn('unicode-bidi-plaintext', className)}>
      {children}
    </span>
  );
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'border-brand-accent/15 bg-card/90 relative overflow-hidden rounded-2xl border p-6 shadow-lg backdrop-blur-xl',
        'dark:border-white/10 dark:bg-black/40',
        className
      )}
    >
      <span
        className="via-brand-accent/50 pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
        aria-hidden
      />
      {children}
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  href,
  external,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const content = (
    <div className="hover:bg-brand-accent/5 group flex items-center gap-4 rounded-xl p-3 transition-colors">
      <div className="bg-brand-accent/10 text-brand-accent ring-brand-accent/20 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
        <div className="text-foreground group-hover:text-primary mt-0.5 text-sm font-medium transition-colors">
          {children}
        </div>
      </div>
      {href && external && (
        <ExternalLink className="text-muted-foreground/50 group-hover:text-brand-accent h-4 w-4 shrink-0 transition-colors" />
      )}
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="focus-visible:ring-brand-accent block rounded-xl focus-visible:outline-none focus-visible:ring-2"
      >
        {content}
      </a>
    );
  }

  return content;
}

export function ContactSection() {
  const { data: settings } = useRestaurantSettings();
  const { locale } = useI18n();
  const t = useTranslations('landing');

  const address = resolveContactAddress(settings, locale);
  const mapUrl = settings?.google_maps_url?.trim() || null;
  const mapEmbedUrl = getMapEmbedUrl(mapUrl);
  const phone = settings?.phone?.trim();
  const whatsapp = settings?.whatsapp?.trim();
  const email = settings?.email?.trim();

  const hasSocial = settings?.instagram || settings?.facebook || settings?.tiktok;

  return (
    <section id="contact" className="relative overflow-hidden py-20 md:py-28">
      <div
        className="via-brand-accent/[0.03] pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-transparent"
        aria-hidden
      />
      <div className="via-brand-accent/30 pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />

      <div className="container relative mx-auto px-4">
        <MotionSection>
          <div className="mb-14 text-center">
            <p className="font-heading text-brand-accent mb-3 text-sm font-medium uppercase tracking-[0.22em]">
              {t('contactSubtitle')}
            </p>
            <h2 className="font-heading text-primary text-4xl font-bold md:text-5xl">
              {t('contactUs')}
            </h2>
            <div className="bg-brand-accent mx-auto mt-4 h-1 w-20 rounded" />
          </div>
        </MotionSection>

        <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
          <MotionSection delay={0.1} className="lg:col-span-2">
            <GlassCard className="h-full">
              <h3 className="font-heading text-primary mb-2 text-xl font-semibold">
                {t('getInTouch')}
              </h3>
              <p className="text-muted-foreground mb-6 text-sm">{t('contactReachUs')}</p>

              <div className="space-y-1">
                {phone ? (
                  <ContactRow icon={Phone} label={t('phone')} href={`tel:${phone}`}>
                    <LtrText>{phone}</LtrText>
                  </ContactRow>
                ) : null}

                {whatsapp ? (
                  <ContactRow
                    icon={MessageCircle}
                    label={t('whatsapp')}
                    href={formatWhatsAppUrl(whatsapp)}
                    external
                  >
                    <LtrText>{whatsapp}</LtrText>
                  </ContactRow>
                ) : null}

                {email ? (
                  <ContactRow icon={Mail} label={t('email')} href={`mailto:${email}`}>
                    <LtrText>{email}</LtrText>
                  </ContactRow>
                ) : null}

                {!phone && !whatsapp && !email && (
                  <p className="text-muted-foreground py-4 text-sm">{t('contactEmpty')}</p>
                )}
              </div>
            </GlassCard>
          </MotionSection>

          <MotionSection delay={0.2} className="lg:col-span-3">
            <GlassCard className="h-full p-0">
              <div className="grid md:grid-cols-2">
                <div className="relative min-h-[220px] overflow-hidden md:min-h-[280px]">
                  {mapEmbedUrl ? (
                    <iframe
                      title={t('locationMap')}
                      src={mapEmbedUrl}
                      className="absolute inset-0 h-full w-full border-0 contrast-[1.05] grayscale-[20%]"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  ) : (
                    <div className="from-brand-primary/10 via-muted/50 to-brand-secondary/10 absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br p-6">
                      <div className="bg-brand-accent/10 ring-brand-accent/25 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ring-1">
                        <MapPin className="text-brand-accent h-8 w-8" />
                      </div>
                      <p className="font-heading text-foreground text-center text-lg font-semibold">
                        {address}
                      </p>
                    </div>
                  )}
                  <div className="ring-brand-accent/10 pointer-events-none absolute inset-0 ring-1 ring-inset" />
                </div>

                <div className="border-brand-accent/10 flex flex-col justify-between border-t p-6 md:border-s md:border-t-0">
                  <div>
                    <h3 className="font-heading text-primary mb-4 text-xl font-semibold">
                      {t('ourLocation')}
                    </h3>
                    <div className="flex items-start gap-3">
                      <MapPin className="text-brand-accent mt-0.5 h-5 w-5 shrink-0" />
                      <p className="text-muted-foreground text-sm leading-relaxed">{address}</p>
                    </div>
                  </div>

                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-brand-accent/30 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 mt-6 inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-medium transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t('viewOnMap')}
                    </a>
                  )}
                </div>
              </div>
            </GlassCard>
          </MotionSection>
        </div>

        <MotionSection delay={0.3} className="mt-6">
          <GlassCard>
            <h3 className="font-heading text-primary mb-6 text-xl font-semibold">
              {t('followUs')}
            </h3>

            {hasSocial ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {settings?.instagram && (
                  <a
                    href={`https://instagram.com/${settings.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border/60 hover:border-brand-accent/40 hover:bg-brand-accent/5 group flex items-center gap-3 rounded-xl border p-4 transition-all"
                  >
                    <Camera className="text-brand-accent h-5 w-5" />
                    <span className="text-foreground group-hover:text-primary text-sm font-medium">
                      {settings.instagram.startsWith('@')
                        ? settings.instagram
                        : `@${settings.instagram.replace('@', '')}`}
                    </span>
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
                    className="border-border/60 hover:border-brand-accent/40 hover:bg-brand-accent/5 group flex items-center gap-3 rounded-xl border p-4 transition-all"
                  >
                    <Globe className="text-brand-accent h-5 w-5" />
                    <span className="text-foreground group-hover:text-primary text-sm font-medium">
                      {t('facebook')}
                    </span>
                  </a>
                )}
                {settings?.tiktok && (
                  <a
                    href={`https://tiktok.com/@${settings.tiktok.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border/60 hover:border-brand-accent/40 hover:bg-brand-accent/5 group flex items-center gap-3 rounded-xl border p-4 transition-all"
                  >
                    <Smartphone className="text-brand-accent h-5 w-5" />
                    <span className="text-foreground group-hover:text-primary text-sm font-medium">
                      {t('tiktok')}
                    </span>
                  </a>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t('socialLinks')}</p>
            )}
          </GlassCard>
        </MotionSection>
      </div>
    </section>
  );
}
