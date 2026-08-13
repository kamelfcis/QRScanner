import { cookies, headers } from 'next/headers';
import { LoginForm } from './login-form';
import {
  LOGIN_LOCALE_COOKIE,
  detectLocaleFromAcceptLanguage,
  isLoginLocale,
  type LoginLocale,
} from '@/lib/login-i18n';

export default async function LoginPage() {
  const stored = (await cookies()).get(LOGIN_LOCALE_COOKIE)?.value;
  const locale: LoginLocale = isLoginLocale(stored)
    ? stored
    : detectLocaleFromAcceptLanguage((await headers()).get('accept-language'));

  return <LoginForm initialLocale={locale} />;
}
