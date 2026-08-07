import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as Locale)) {
    const cookieStore = await cookies();
    locale = cookieStore.get('NEXT_LOCALE')?.value || defaultLocale;
  }

  if (!locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
