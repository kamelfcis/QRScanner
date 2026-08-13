'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoginSplit } from '@/components/engaz/LoginSplit';
import { cn } from '@/lib/utils';
import {
  LOGIN_LOCALE_STORAGE,
  isLoginLocale,
  loginCopy,
  loginErrorKeyFromMessage,
  loginErrorText,
  persistLoginLocale,
  type LoginErrorKey,
  type LoginLocale,
} from '@/lib/login-i18n';

export function LoginForm({ initialLocale }: { initialLocale: LoginLocale }) {
  const [locale, setLocale] = useState<LoginLocale>(initialLocale);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorKey, setErrorKey] = useState<LoginErrorKey | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const copy = loginCopy[locale];
  const rtl = locale === 'ar';

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOGIN_LOCALE_STORAGE);
      if (isLoginLocale(stored) && stored !== initialLocale) {
        setLocale(stored);
      }
    } catch {
      /* private mode */
    }
  }, [initialLocale]);

  useEffect(() => {
    const html = document.documentElement;
    const prevLang = html.lang;
    html.lang = locale;
    return () => {
      html.lang = prevLang;
    };
  }, [locale]);

  useEffect(() => {
    if (search.get('error') === 'forbidden') {
      setErrorKey('notAdmin');
    }
  }, [search]);

  function switchLocale() {
    const next: LoginLocale = locale === 'ar' ? 'en' : 'ar';
    setLocale(next);
    persistLoginLocale(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorKey(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user session');

      const { data: admin } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!admin) {
        await supabase.auth.signOut();
        throw new Error('This account is not an Engaz super admin');
      }

      const redirect = search.get('redirect') || '/';
      router.push(redirect.startsWith('/') ? redirect : '/');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setErrorKey(loginErrorKeyFromMessage(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginSplit copy={copy} locale={locale}>
      <div
        dir={rtl ? 'rtl' : 'ltr'}
        lang={locale}
        className={cn(
          'login-fade-up-delay-1 relative overflow-hidden rounded-[20px] bg-white p-5 shadow-[0_30px_70px_-24px_rgba(0,0,0,0.7)] ring-1 ring-white/10 sm:p-6',
          rtl && 'login-ar'
        )}
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-[#51FE00]" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#0B1220]">
            <img
              src="/brand/engaz-logo.png"
              alt="Engaz"
              className="size-7 object-contain"
            />
          </span>
          <button
            type="button"
            onClick={switchLocale}
            className={cn(
              'rounded-lg border border-[#E6EAF0] px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-[#51FE00] hover:bg-[#51FE00]/10 hover:text-[#0B1220]',
              // The mono face is Latin-only, so the Arabic toggle label keeps the Arabic face.
              rtl ? 'login-mono text-[11px] tracking-[0.12em] uppercase' : 'login-ar'
            )}
            aria-label={copy.langToggleAria}
          >
            {copy.langToggle}
          </button>
        </div>
        <h2 className="font-heading text-[22px] font-semibold tracking-tight text-[#0B1220] sm:text-2xl">
          {copy.welcome}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
          {errorKey && (
            <div
              role="alert"
              className="bg-destructive/10 text-destructive rounded-xl p-2.5 text-sm"
            >
              {loginErrorText(errorKey, copy)}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm">
              {copy.email}
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder={copy.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 rounded-xl ps-9 focus-visible:border-[#51FE00] focus-visible:ring-[#51FE00]/30"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm">
              {copy.password}
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 rounded-xl ps-9 pe-10 focus-visible:border-[#51FE00] focus-visible:ring-[#51FE00]/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? copy.hidePassword : copy.showPassword}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            className="login-fade-up-delay-2 h-10 w-full rounded-xl bg-[#51FE00] text-sm font-semibold text-[#041200] hover:bg-[#46e000] focus-visible:border-[#51FE00] focus-visible:ring-[#51FE00]/40"
            disabled={loading}
          >
            {loading ? copy.submitting : copy.submit}
          </Button>
        </form>
      </div>

      <p
        dir={rtl ? 'rtl' : 'ltr'}
        className={cn(
          'mt-4 text-center text-[10px] text-white/45',
          rtl ? 'login-ar' : 'login-mono tracking-[0.14em] uppercase'
        )}
      >
        {copy.secureNote}
      </p>
    </LoginSplit>
  );
}
