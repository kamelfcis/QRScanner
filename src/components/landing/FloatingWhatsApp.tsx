'use client';

import { MessageCircle } from 'lucide-react';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { buildCustomerWhatsAppUrl } from '@/lib/phone/normalize';

export function FloatingWhatsApp() {
  const { data: settings } = useRestaurantSettings();
  const t = useTranslations('landing');

  const href = settings?.whatsapp ? buildCustomerWhatsAppUrl(settings.whatsapp) : '';
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] pb-[env(safe-area-inset-bottom)] text-white shadow-lg transition-transform hover:scale-110"
      aria-label={t('chatOnWhatsApp')}
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
