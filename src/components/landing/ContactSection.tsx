'use client';

import { Phone, MapPin, MessageCircle, Globe, Camera, Smartphone } from 'lucide-react';
import { MotionSection } from '@/components/shared/motion';
import { useRestaurantSettings } from '@/hooks/useSettings';

export function ContactSection() {
  const { data: settings } = useRestaurantSettings();

  return (
    <section id="contact" className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <MotionSection>
          <div className="mb-12 text-center">
            <h2 className="font-heading text-4xl font-bold text-primary md:text-5xl">
              Contact Us
            </h2>
            <div className="mx-auto mt-4 h-1 w-20 rounded bg-brand-accent" />
          </div>
        </MotionSection>

        <div className="grid gap-8 md:grid-cols-3">
          <MotionSection delay={0.1}>
            <div className="space-y-6 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
              <h3 className="font-heading text-xl font-semibold">Get in Touch</h3>
              <div className="space-y-4">
                {settings?.phone && (
                  <a
                    href={`tel:${settings.phone}`}
                    className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    {settings.phone}
                  </a>
                )}
                {settings?.whatsapp && (
                  <a
                    href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <MessageCircle className="h-4 w-4 flex-shrink-0" />
                    WhatsApp
                  </a>
                )}
                {settings?.address_en && (
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    {settings.address_en}
                  </div>
                )}
              </div>
            </div>
          </MotionSection>

          <MotionSection delay={0.2}>
            <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <div className="flex aspect-video items-center justify-center bg-muted">
                <div className="text-center">
                  <MapPin className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {settings?.address_en || 'Riyadh, Saudi Arabia'}
                  </p>
                </div>
              </div>
            </div>
          </MotionSection>

          <MotionSection delay={0.3}>
            <div className="space-y-6 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
              <h3 className="font-heading text-xl font-semibold">Follow Us</h3>
              <div className="flex flex-col gap-3">
                {settings?.instagram && (
                  <a
                    href={`https://instagram.com/${settings.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Camera className="h-4 w-4" />
                    {settings.instagram}
                  </a>
                )}
                {settings?.facebook && (
                  <a
                    href={settings.facebook.startsWith('http') ? settings.facebook : `https://facebook.com/${settings.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Globe className="h-4 w-4" />
                    Facebook
                  </a>
                )}
                {settings?.tiktok && (
                  <a
                    href={`https://tiktok.com/@${settings.tiktok.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Smartphone className="h-4 w-4" />
                    TikTok
                  </a>
                )}
                {!settings?.instagram && !settings?.facebook && !settings?.tiktok && (
                  <p className="text-sm text-muted-foreground">Social links coming soon.</p>
                )}
              </div>
            </div>
          </MotionSection>
        </div>
      </div>
    </section>
  );
}
