'use client';

import { useState, type CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import NextImage from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { loginSchema, type LoginInput } from '@/types/schema';
import type { LoginBrandConfig } from '@/lib/login/types';
import { getLocalizedText } from '@/lib/utils';
import { LoginBrandPanel } from './LoginBrandPanel';
import { LoginFormFields } from './LoginFormFields';

interface PremiumLoginTemplateProps {
  brand: LoginBrandConfig;
}

function loginTokenStyle(brand: LoginBrandConfig): CSSProperties {
  const { tokens } = brand;
  return {
    '--login-primary': tokens.primary,
    '--login-accent': tokens.accent,
    '--login-background': tokens.background,
    '--login-surface': tokens.surface,
    '--login-foreground': tokens.foreground,
    '--login-muted': tokens.muted,
    '--login-border': tokens.border,
    '--login-panel': tokens.panelBackground,
    '--login-panel-foreground': tokens.panelForeground,
  } as CSSProperties;
}

export function PremiumLoginTemplate({ brand }: PremiumLoginTemplateProps) {
  const { signIn } = useAuth();
  const t = useTranslations('auth');
  const { locale } = useI18n();
  const displayName = getLocalizedText(locale, { en: brand.nameEn, ar: brand.nameAr });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginInput) => {
    if (submitting) return;
    setAuthError('');
    setSubmitting(true);
    try {
      await signIn(values.email, values.password);
    } catch {
      setAuthError(t('invalidCredentials'));
      setSubmitting(false);
    }
  };

  return (
    <div
      data-login-theme={brand.tenantId}
      className="login-shell relative"
      style={loginTokenStyle(brand)}
    >
      <div
        className="absolute z-10"
        style={{
          top: 'max(1rem, env(safe-area-inset-top))',
          insetInlineEnd: 'clamp(1.25rem, 4vw, 3.25rem)',
        }}
      >
        <LanguageSwitcher />
      </div>
      <section id="main-content" className="login-form-column" tabIndex={-1}>
        <div className="login-form-inner">
          <LoginBrandPanel brand={brand} variant="compact" />
          <p className="login-mobile-kicker">{t('loginTitle')}</p>

          <div className="login-form-header">
            {brand.logoUrl ? (
              <NextImage
                src={brand.logoUrl}
                alt={displayName}
                width={72}
                height={72}
                className="login-form-logo"
                priority
              />
            ) : null}
            <h1 className="login-form-title">{displayName}</h1>
            <p className="login-form-subtitle">{t('loginTitle')}</p>
          </div>

          <form
            id="login-form"
            name="login"
            method="post"
            noValidate
            className="login-form"
            onSubmit={form.handleSubmit(onSubmit)}
            aria-busy={submitting}
          >
            <LoginFormFields
              register={form.register}
              errors={form.formState.errors}
              submitting={submitting}
              authError={authError}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((open) => !open)}
              copy={{
                email: t('email'),
                password: t('password'),
                emailPlaceholder: brand.emailPlaceholder,
                passwordPlaceholder: t('passwordPlaceholder'),
                signIn: t('signIn'),
                signingIn: t('signingIn'),
                showPassword: t('showPassword'),
                hidePassword: t('hidePassword'),
                invalidCredentials: t('invalidCredentials'),
              }}
            />
          </form>
        </div>
      </section>

      <LoginBrandPanel brand={brand} variant="panel" />
    </div>
  );
}
