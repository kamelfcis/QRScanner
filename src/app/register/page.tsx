'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/landing/SiteChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buttonVariants } from '@/components/ui/button';
import { BUSINESS_TYPES } from '@/lib/copy';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ENGAZ_LOGO_ALT, ENGAZ_LOGO_SRC } from '@/lib/brand';

type FormState = {
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  businessName: string;
  businessType: string;
  address: string;
  city: string;
};

const INITIAL: FormState = {
  ownerName: '',
  email: '',
  phone: '',
  password: '',
  businessName: '',
  businessType: 'restaurant',
  address: '',
  city: '',
};

export default function RegisterPage() {
  const { t } = useI18n();
  const r = t.register;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL);
  const [logo, setLogo] = useState<File | null>(null);
  const [menu, setMenu] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadWarning, setUploadWarning] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep() {
    if (step === 0) {
      if (!form.ownerName.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
        setError(r.errors.required);
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setError(r.errors.email);
        return false;
      }
      if (form.password.length < 8) {
        setError(r.errors.password);
        return false;
      }
    }
    if (step === 1) {
      if (!form.businessName.trim() || !form.businessType || !form.city.trim() || !form.address.trim()) {
        setError(r.errors.required);
        return false;
      }
    }
    setError('');
    return true;
  }

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const data = new FormData();
      data.set('ownerName', form.ownerName.trim());
      data.set('email', form.email.trim());
      data.set('phone', form.phone.trim());
      data.set('password', form.password);
      data.set('businessName', form.businessName.trim());
      data.set('businessType', form.businessType);
      data.set('address', form.address.trim());
      data.set('city', form.city.trim());
      if (logo) data.set('logo', logo);
      if (menu) data.set('menu', menu);

      const res = await fetch('/api/register', { method: 'POST', body: data });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = json.code as string | undefined;
        if (code === 'duplicate') setError(r.errors.duplicate);
        else if (code === 'email') setError(r.errors.email);
        else if (code === 'upload') setError(r.errors.upload);
        else if (code === 'password') setError(r.errors.password);
        else setError(r.errors.generic);
        return;
      }
      setUploadWarning(Boolean(json.uploadWarning));
      setStep(3);
    } catch {
      setError(r.errors.network);
    } finally {
      setLoading(false);
    }
  }

  function next() {
    if (!validateStep()) return;
    if (step === 2) {
      void submit();
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div>
      <SiteHeader solid />
      <main className="mx-auto max-w-xl px-4 py-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ENGAZ_LOGO_SRC}
          alt={ENGAZ_LOGO_ALT}
          className="mb-6 h-14 w-auto max-w-[220px] object-contain"
        />
        <h1 className="font-heading text-3xl font-bold">{r.title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{r.subtitle}</p>

        <ol className="mt-8 grid grid-cols-4 gap-2 text-center text-xs">
          {r.steps.map((label, i) => (
            <li
              key={label}
              className={cn(
                'rounded-lg border px-2 py-2',
                i === step ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
              )}
            >
              {label}
            </li>
          ))}
        </ol>

        {step < 3 && (
          <div className="surface-card mt-8 space-y-4 rounded-2xl p-6">
            {error && (
              <div role="alert" className="rounded-md bg-rose-500/10 px-3 py-2 text-destructive text-sm">
                {error}
              </div>
            )}

            {step === 0 && (
              <>
                <Field label={r.ownerName} value={form.ownerName} onChange={(v) => update('ownerName', v)} />
                <Field label={r.email} type="email" value={form.email} onChange={(v) => update('email', v)} />
                <Field label={r.phone} value={form.phone} onChange={(v) => update('phone', v)} />
                <Field
                  label={r.password}
                  type="password"
                  value={form.password}
                  onChange={(v) => update('password', v)}
                />
                <p className="text-muted-foreground text-xs">{r.passwordHint}</p>
              </>
            )}

            {step === 1 && (
              <>
                <Field label={r.businessName} value={form.businessName} onChange={(v) => update('businessName', v)} />
                <div className="space-y-2">
                  <Label>{r.businessType}</Label>
                  <select
                    className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
                    value={form.businessType}
                    onChange={(e) => update('businessType', e.target.value)}
                  >
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {r.types[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <Field label={r.city} value={form.city} onChange={(v) => update('city', v)} />
                <Field label={r.address} value={form.address} onChange={(v) => update('address', v)} />
              </>
            )}

            {step === 2 && (
              <>
                <FileField
                  label={r.logo}
                  accept="image/jpeg,image/png,image/webp"
                  file={logo}
                  onChange={setLogo}
                />
                <FileField
                  label={r.menu}
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  file={menu}
                  onChange={setMenu}
                />
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" disabled={step === 0 || loading} onClick={() => setStep((s) => s - 1)}>
                {r.back}
              </Button>
              <Button type="button" disabled={loading} onClick={next}>
                {loading ? '…' : step === 2 ? r.submit : step === 1 ? r.next : r.next}
              </Button>
            </div>
            {step === 2 && (
              <button type="button" className="text-muted-foreground text-xs underline" onClick={next} disabled={loading}>
                {r.skipFiles}
              </button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="surface-card mt-8 rounded-2xl p-8 text-center">
            <h2 className="font-heading text-2xl font-bold">{r.successTitle}</h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{r.successBody}</p>
            {uploadWarning && <p className="mt-3 text-sm text-amber-700 dark:text-amber-200">{r.successUploadWarn}</p>}
            <Link href="/" className={cn(buttonVariants({ size: 'lg' }), 'mt-6 inline-flex')}>
              {r.home}
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}

function FileField({
  label,
  accept,
  file,
  onChange,
}: {
  label: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      {file && <p className="text-muted-foreground text-xs">{file.name}</p>}
    </div>
  );
}
