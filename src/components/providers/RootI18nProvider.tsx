'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { NextIntlClientProvider, useTranslations as useNextTranslations } from 'next-intl';
import { type Locale, locales, defaultLocale, isRtl } from '@/i18n/config';
import enMessages from '@/messages/en.json';
import arMessages from '@/messages/ar.json';

const messages: Record<Locale, typeof enMessages> = {
  en: enMessages,
  ar: arMessages,
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
  dir: 'ltr',
});

export function useI18n() {
  return useContext(I18nContext);
}

export function useTranslations(namespace?: string) {
  return useNextTranslations(namespace);
}

export function RootI18nProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || defaultLocale);
  const dir = isRtl(locale) ? 'rtl' : 'ltr';

  useEffect(() => {
    const saved = document.cookie
      .split('; ')
      .find((row) => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] as Locale | undefined;
    if (saved && locales.includes(saved) && saved !== locale) {
      setLocaleState(saved);
      document.documentElement.dir = isRtl(saved) ? 'rtl' : 'ltr';
      document.documentElement.lang = saved;
    }
  }, [locale]);

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
