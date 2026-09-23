'use client';

import { Phone } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { buildCustomerWhatsAppUrl, buildTelUri } from '@/lib/phone/normalize';
import { cn } from '@/lib/utils';

const contactButtonBase =
  'inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--menu-paper)]';

interface MenuContactButtonsProps {
  tableParam: string | null;
  className?: string;
  buttonClassName?: string;
}

export function MenuContactButtons({
  tableParam,
  className,
  buttonClassName,
}: MenuContactButtonsProps) {
  const { data: settings } = useRestaurantSettings();
  const { locale } = useI18n();
  const t = useTranslations('menu');

  const whatsappRaw = settings?.whatsapp?.trim();
  const phoneRaw = settings?.phone?.trim();
  const whatsappHref = whatsappRaw ? buildCustomerWhatsAppUrl(whatsappRaw) : '';
  const phoneHref = phoneRaw ? buildTelUri(phoneRaw) : '';

  if (!whatsappHref && !phoneHref) return null;

  const waiterMessage = tableParam
    ? encodeURIComponent(
        locale === 'ar'
          ? `مرحباً، أحتاج مساعدة في الطاولة رقم ${tableParam}`
          : `Hello, I need assistance at table ${tableParam}`
      )
    : '';

  const whatsappUrl =
    whatsappHref && waiterMessage ? `${whatsappHref}?text=${waiterMessage}` : whatsappHref;

  const whatsappLabel = tableParam ? t('callWaiter') : t('contactWhatsApp');

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {whatsappHref ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            contactButtonBase,
            'bg-[#25D366] hover:bg-[#1fba59] focus-visible:ring-[#25D366]',
            buttonClassName
          )}
          aria-label={whatsappLabel}
        >
          <WhatsAppIcon />
        </a>
      ) : null}

      {phoneHref ? (
        <a
          href={phoneHref}
          className={cn(
            contactButtonBase,
            'bg-[#2563EB] hover:bg-[#1d4ed8] focus-visible:ring-[#2563EB]',
            buttonClassName
          )}
          aria-label={t('callRestaurant')}
        >
          <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
