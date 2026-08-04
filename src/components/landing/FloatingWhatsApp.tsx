'use client';

import { MessageCircle } from 'lucide-react';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useTranslations } from '@/components/providers/RootI18nProvider';

export function FloatingWhatsApp() {
  const { data: settings } = useRestaurantSettings();
  const t = useTranslations('landing');

  if (!settings?.whatsapp) return null;

  const phone = settings.whatsapp.replace(/[^0-9]/g, '');

  return (
    <a
      href={`https://wa.me/${phone}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 pb-[env(safe-area-inset-bottom)] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110"
      aria-label={t('chatOnWhatsApp')}
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
