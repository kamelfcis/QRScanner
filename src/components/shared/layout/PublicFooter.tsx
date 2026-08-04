'use client';

import Link from 'next/link';
import { Phone, MapPin, Camera, Globe, Smartphone, MessageCircle } from 'lucide-react';
import { useRestaurantSettings } from '@/hooks/useSettings';

export function PublicFooter() {
  const { data: settings } = useRestaurantSettings();

  const name = settings?.name_en || 'Warda Shamya';

  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              {settings?.logo_url && (
                <img
                  src={settings.logo_url}
                  alt={name}
                  className="h-8 w-auto object-contain"
                />
              )}
              <h3 className="text-lg font-bold text-primary font-heading">{name}</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Premium dining experience celebrating Lebanese and Syrian culinary traditions.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Quick Links</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/menu" className="text-sm text-muted-foreground hover:text-primary">
                  Menu
                </Link>
              </li>
              <li>
                <Link href="#story" className="text-sm text-muted-foreground hover:text-primary">
                  Our Story
                </Link>
              </li>
              <li>
                <Link href="#contact" className="text-sm text-muted-foreground hover:text-primary">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Contact Info</h4>
            <ul className="mt-3 space-y-2">
              {settings?.phone && (
                <li>
                  <a
                    href={`tel:${settings.phone}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {settings.phone}
                  </a>
                </li>
              )}
              {settings?.address_en && (
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  {settings.address_en}
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Follow Us</h4>
            <div className="mt-3 flex gap-3">
              {settings?.instagram && (
                <a
                  href={`https://instagram.com/${settings.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  aria-label="Instagram"
                >
                  <Camera className="h-5 w-5" />
                </a>
              )}
              {settings?.facebook && (
                <a
                  href={settings.facebook.startsWith('http') ? settings.facebook : `https://facebook.com/${settings.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  aria-label="Facebook"
                >
                  <Globe className="h-5 w-5" />
                </a>
              )}
              {settings?.tiktok && (
                <a
                  href={`https://tiktok.com/@${settings.tiktok.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  aria-label="TikTok"
                >
                  <Smartphone className="h-5 w-5" />
                </a>
              )}
              {settings?.whatsapp && (
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-8">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
