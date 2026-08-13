export type LoginLocale = 'ar' | 'en';

export const LOGIN_LOCALE_COOKIE = 'engaz-admin-locale';
export const LOGIN_LOCALE_STORAGE = 'engaz-admin-locale';

export type LoginCopy = {
  brandTitle: string;
  brandKicker: string;
  brandBody: string;
  qrCaption: string;
  byline: string;
  eyebrow: string;
  secureNote: string;
  welcome: string;
  subtitle: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  showPassword: string;
  hidePassword: string;
  submit: string;
  submitting: string;
  errorInvalid: string;
  errorNotAdmin: string;
  errorFailed: string;
  errorUnconfirmed: string;
  langToggle: string;
  langToggleAria: string;
};

export const loginCopy: Record<LoginLocale, LoginCopy> = {
  en: {
    brandTitle: 'Engaz Admin',
    brandKicker: 'Super-admin control center',
    brandBody:
      'Provision restaurants, manage QR menus, and monitor deployments from one place.',
    qrCaption: 'QR to live menu',
    byline: 'by ILC Soft',
    eyebrow: 'Control plane',
    secureNote: 'Secure sign-in \u00b7 super admins only',
    welcome: 'Welcome back',
    subtitle: 'Sign in to Engaz Admin',
    email: 'Email',
    emailPlaceholder: 'you@company.com',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submit: 'Sign in',
    submitting: 'Signing in...',
    errorInvalid: 'Invalid email or password',
    errorNotAdmin: 'This account is not an Engaz super admin',
    errorFailed: 'Login failed',
    errorUnconfirmed: 'Please confirm your email first',
    langToggle: '\u0639\u0631',
    langToggleAria: 'Switch to Arabic',
  },
  ar: {
    brandTitle: 'Engaz Admin',
    brandKicker: '\u0645\u0631\u0643\u0632 \u062a\u062d\u0643\u0645 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0639\u0627\u0645',
    brandBody:
      '\u0623\u0646\u0634\u0626 \u0645\u0637\u0627\u0639\u0645\u0643\u060c \u0623\u062f\u0650\u0631 \u0642\u0648\u0627\u0626\u0645 QR\u060c \u0648\u062a\u0627\u0628\u0639 \u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u0646\u0634\u0631 \u0645\u0646 \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f.',
    qrCaption: '\u0645\u0646 QR \u0625\u0644\u0649 \u0642\u0627\u0626\u0645\u0629 \u062d\u064a\u0629',
    byline: '\u0628\u0648\u0627\u0633\u0637\u0629 ILC Soft',
    eyebrow: '\u0645\u0631\u0643\u0632 \u0627\u0644\u062a\u062d\u0643\u0645',
    secureNote:
      '\u062f\u062e\u0648\u0644 \u0622\u0645\u0646 \u00b7 \u0644\u0644\u0645\u0633\u0624\u0648\u0644\u064a\u0646 \u0627\u0644\u0639\u0627\u0645\u064a\u0646 \u0641\u0642\u0637',
    welcome: '\u0645\u0631\u062d\u0628\u064b\u0627 \u0628\u0639\u0648\u062f\u062a\u0643',
    subtitle: '\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0625\u0644\u0649 Engaz Admin',
    email: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
    emailPlaceholder: 'you@company.com',
    password: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
    showPassword: '\u0625\u0638\u0647\u0627\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
    hidePassword: '\u0625\u062e\u0641\u0627\u0621 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
    submit: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
    submitting: '\u062c\u0627\u0631\u064d \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644...',
    errorInvalid: '\u0627\u0644\u0628\u0631\u064a\u062f \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629',
    errorNotAdmin: '\u0647\u0630\u0627 \u0627\u0644\u062d\u0633\u0627\u0628 \u0644\u064a\u0633 \u0645\u0633\u0624\u0648\u0644 Engaz \u0639\u0627\u0645',
    errorFailed: '\u0641\u0634\u0644 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
    errorUnconfirmed: '\u064a\u0631\u062c\u0649 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0623\u0648\u0644\u064b\u0627',
    langToggle: 'EN',
    langToggleAria: '\u0627\u0644\u062a\u0628\u062f\u064a\u0644 \u0625\u0644\u0649 \u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629',
  },
};

export function isLoginLocale(value: string | undefined | null): value is LoginLocale {
  return value === 'ar' || value === 'en';
}

export function detectLocaleFromAcceptLanguage(header: string | null | undefined): LoginLocale {
  const first = header?.split(',')[0]?.trim().toLowerCase() ?? '';
  return first.startsWith('ar') ? 'ar' : 'en';
}

export function persistLoginLocale(locale: LoginLocale) {
  try {
    localStorage.setItem(LOGIN_LOCALE_STORAGE, locale);
  } catch {
    /* private mode */
  }
  document.cookie = LOGIN_LOCALE_COOKIE + '=' + locale + '; path=/; max-age=31536000; SameSite=Lax';
}

export type LoginErrorKey = 'invalid' | 'notAdmin' | 'failed' | 'unconfirmed';

export function loginErrorKeyFromMessage(message: string): LoginErrorKey {
  const m = message.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid_credentials') || m.includes('invalid email')) {
    return 'invalid';
  }
  if (m.includes('not an engaz super admin') || m.includes('forbidden')) {
    return 'notAdmin';
  }
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return 'unconfirmed';
  }
  return 'failed';
}

export function loginErrorText(key: LoginErrorKey, copy: LoginCopy): string {
  if (key === 'invalid') return copy.errorInvalid;
  if (key === 'notAdmin') return copy.errorNotAdmin;
  if (key === 'unconfirmed') return copy.errorUnconfirmed;
  return copy.errorFailed;
}
