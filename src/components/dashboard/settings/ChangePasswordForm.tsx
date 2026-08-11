'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, KeyRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from '@/components/providers/RootI18nProvider';

const MIN_PASSWORD_LENGTH = 6;

export function ChangePasswordForm() {
  const { changePassword, user } = useAuth();
  const t = useTranslations('auth');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      toast.error(t('changePasswordCurrentRequired'));
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(t('changePasswordTooShort', { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('changePasswordMismatch'));
      return;
    }
    if (newPassword === currentPassword) {
      toast.error(t('changePasswordSameAsCurrent'));
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(t('changePasswordSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('changePasswordFailed');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('changePasswordTitle')}</CardTitle>
        <CardDescription>{t('changePasswordDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          {user?.email && (
            <div className="space-y-2">
              <Label htmlFor="account-email">{t('email')}</Label>
              <Input
                id="account-email"
                type="email"
                value={user.email}
                readOnly
                disabled
                dir="ltr"
                className="unicode-bidi-plaintext bg-muted"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="current-password">{t('currentPassword')}</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t('currentPasswordPlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">{t('newPassword')}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('newPasswordPlaceholder')}
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t('confirmPassword')}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('confirmPasswordPlaceholder')}
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            {loading ? t('changingPassword') : t('changePasswordButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
