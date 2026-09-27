'use client';

import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { resolveContactField, formatWhatsAppUrl } from '@/lib/contact/defaults';

export function FloatingWhatsApp() {
  const { data: settings } = useRestaurantSettings();
  const t = useTranslations('landing');

  const whatsapp = resolveContactField(settings?.whatsapp);
  if (!whatsapp) return null;

  const href = formatWhatsAppUrl(whatsapp);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] pb-[env(safe-area-inset-bottom)] text-white shadow-lg transition-transform hover:scale-110"
      aria-label={t('chatOnWhatsApp')}
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
