'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { quickRegisterCustomer } from '@/app/actions/customer-register';

interface CustomerAccount {
  id: string;
  first_name: string;
  display_name: string | null;
  points_balance: number;
  phone_normalized: string;
}

interface QuickRegisterCardProps {
  phone: string;
  firstName: string;
  onRegistered?: (account: CustomerAccount) => void;
}

export function QuickRegisterCard({ phone, firstName, onRegistered }: QuickRegisterCardProps) {
  const t = useTranslations('account');
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/customer/account');
        if (res.ok) {
          setAccount((await res.json()) as CustomerAccount);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRegister = async () => {
    if (!phone.trim() || !firstName.trim()) {
      toast.error(t('registerHint'));
      return;
    }
    setRegistering(true);
    try {
      const result = await quickRegisterCustomer({ phone, firstName });
      if ('error' in result) {
        toast.error(t('registerFailed'));
        return;
      }
      const res = await fetch('/api/customer/account');
      if (res.ok) {
        const data = (await res.json()) as CustomerAccount;
        setAccount(data);
        onRegistered?.(data);
        toast.success(t('registered'));
      }
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return null;
  if (account) {
    return (
      <div className="rounded-xl border border-[var(--menu-line-strong)] bg-[var(--menu-surface)] p-4">
        <p className="text-sm font-medium">{account.display_name ?? account.first_name}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {t('pointsBalance', { count: account.points_balance })}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--menu-line-strong)] bg-[var(--menu-surface)] p-4">
      <p className="font-heading text-sm font-semibold">{t('quickRegisterTitle')}</p>
      <p className="text-muted-foreground mt-1 text-xs">{t('quickRegisterHint')}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="qr-phone" className="text-xs">
            {t('phone')}
          </Label>
          <Input id="qr-phone" value={phone} readOnly className="mt-1 h-10 bg-transparent" />
        </div>
        <div>
          <Label htmlFor="qr-name" className="text-xs">
            {t('firstName')}
          </Label>
          <Input id="qr-name" value={firstName} readOnly className="mt-1 h-10 bg-transparent" />
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-3 min-h-10 w-full border-[var(--ak-gold,#b8860b)] text-[var(--ak-ember,#d97706)]"
        disabled={registering || !phone.trim() || !firstName.trim()}
        onClick={() => void handleRegister()}
      >
        {t('saveAccount')}
      </Button>
    </div>
  );
}
