'use client';

import { MessageCircle, Phone } from 'lucide-react';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { buildCustomerWhatsAppUrl, buildTelUri } from '@/lib/phone/normalize';
import { cn } from '@/lib/utils';

const iconButton =
  'inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--menu-ink)] transition-colors hover:bg-[var(--menu-gold-wash)]';

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
    <div className={cn('flex items-center gap-0.5', className)}>
      {whatsappHref ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(iconButton, buttonClassName)}
          aria-label={whatsappLabel}
        >
          <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
        </a>
      ) : null}

      {phoneHref ? (
        <a
          href={phoneHref}
          className={cn(iconButton, buttonClassName)}
          aria-label={t('callRestaurant')}
        >
          <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
