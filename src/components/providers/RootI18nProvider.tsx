'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { type Locale, locales, defaultLocale } from '@/i18n/config';
import enMessages from '@/messages/en.json';
import arMessages from '@/messages/ar.json';

const messages: Record<Locale, Record<string, unknown>> = {
  en: enMessages,
  ar: arMessages,
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
});

export function useI18n() {
  return useContext(I18nContext);
}

export function RootI18nProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || defaultLocale);

  useEffect(() => {
    const saved = document.cookie
      .split('; ')
      .find((row) => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] as Locale | undefined;
    if (saved && locales.includes(saved) && saved !== locale) {
      setLocaleState(saved);
      document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = saved;
    }
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${365 * 24 * 60 * 60}`;
    setLocaleState(newLocale);
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;
    window.location.reload();
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  );
}
