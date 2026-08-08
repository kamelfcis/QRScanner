'use client';

import { useState, createContext, useContext, useCallback } from 'react';
import { NextIntlClientProvider, useTranslations as useNextTranslations } from 'next-intl';
import { type Locale, defaultLocale, isRtl } from '@/i18n/config';
import { getAppNameFallback } from '@/lib/appName';
import enMessages from '@/messages/en.json';
import arMessages from '@/messages/ar.json';

function withAppNameOverride(localeMessages: typeof enMessages): typeof enMessages {
  const appName = getAppNameFallback();
  return {
    ...localeMessages,
    common: {
      ...localeMessages.common,
      appName,
    },
  };
}

const messages: Record<Locale, typeof enMessages> = {
  en: withAppNameOverride(enMessages),
  ar: withAppNameOverride(arMessages),
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
  dir: isRtl(defaultLocale) ? 'rtl' : 'ltr',
});

export function useI18n() {
  return useContext(I18nContext);
}

export function useTranslations(namespace?: string) {
  return useNextTranslations(namespace);
}

export function RootI18nProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  // Trust SSR locale from middleware/headers only — no client cookie re-sync (avoids hydration #418)
  const [locale, setLocaleState] = useState<Locale>(initialLocale || defaultLocale);
  const dir = isRtl(locale) ? 'rtl' : 'ltr';

  const setLocale = useCallback((newLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${365 * 24 * 60 * 60}`;
    setLocaleState(newLocale);
    document.documentElement.dir = isRtl(newLocale) ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;
    window.location.reload();
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, dir }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  );
}
