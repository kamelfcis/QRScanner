'use client';

import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LoginInput } from '@/types/schema';

interface LoginFormCopy {
  email: string;
  password: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  signIn: string;
  signingIn: string;
  showPassword: string;
  hidePassword: string;
  invalidCredentials: string;
}

interface LoginFormFieldsProps {
  register: UseFormRegister<LoginInput>;
  errors: FieldErrors<LoginInput>;
  submitting: boolean;
  authError: string;
  showPassword: boolean;
  onTogglePassword: () => void;
  copy: LoginFormCopy;
}

export function LoginFormFields({
  register,
  errors,
  submitting,
  authError,
  showPassword,
  onTogglePassword,
  copy,
}: LoginFormFieldsProps) {
  const emailInvalid = Boolean(errors.email);
  const passwordInvalid = Boolean(errors.password);

  return (
    <div className="login-form-stack">
      {authError ? (
        <p id="login-auth-error" role="alert" className="login-alert">
          {authError}
        </p>
      ) : null}

      <div className="login-field">
        <Label htmlFor="email" className="login-label">
          {copy.email}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={copy.emailPlaceholder}
          aria-required="true"
          aria-invalid={emailInvalid}
          aria-describedby={emailInvalid ? 'login-email-error' : undefined}
          disabled={submitting}
          className="login-input h-12"
          {...register('email')}
        />
        {errors.email ? (
          <p id="login-email-error" className="login-field-error">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="login-field">
        <Label htmlFor="password" className="login-label">
          {copy.password}
        </Label>
        <div className="login-password-wrap">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder={copy.passwordPlaceholder}
            aria-required="true"
            aria-invalid={passwordInvalid}
            aria-describedby={passwordInvalid ? 'login-password-error' : undefined}
            disabled={submitting}
            className="login-input login-input-password h-12"
            {...register('password')}
          />
          <button
            type="button"
            className="login-password-toggle"
            onClick={onTogglePassword}
            aria-label={showPassword ? copy.hidePassword : copy.showPassword}
            aria-pressed={showPassword}
            tabIndex={0}
            disabled={submitting}
          >
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
        {errors.password ? (
          <p id="login-password-error" className="login-field-error">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        size="lg"
        className="login-submit h-12 w-full"
        disabled={submitting}
        aria-disabled={submitting}
        aria-busy={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="login-submit-spinner animate-spin" aria-hidden="true" />
            {copy.signingIn}
          </>
        ) : (
          copy.signIn
        )}
      </Button>
    </div>
  );
}
