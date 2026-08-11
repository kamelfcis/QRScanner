'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TEMPLATE_CONFIGS, type TemplateType } from '@/lib/engaz/types';

const STEPS = ['Template', 'Identity', 'Supabase', 'Review'] as const;

export default function NewCustomerPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    templateType: 'warda' as TemplateType,
    slug: '',
    displayNameAr: '',
    displayNameEn: '',
    adminEmail: '',
    adminPassword: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
    supabaseServiceRoleKey: '',
    supabaseDbPassword: '',
    supabaseAccessToken: '',
    supabaseProjectRef: '',
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    if (step === 0) return setStep(1);
    if (step === 1) {
      if (!form.slug || !form.displayNameEn || !form.displayNameAr) {
        toast.error('Fill slug and display names');
        return;
      }
      return setStep(2);
    }
    if (step === 2) {
      if (
        !form.supabaseUrl ||
        !form.supabaseAnonKey ||
        !form.supabaseServiceRoleKey ||
        !form.supabaseAccessToken ||
        !form.supabaseProjectRef ||
        !form.supabaseDbPassword
      ) {
        toast.error('All Supabase fields are required');
        return;
      }
      return setStep(3);
    }
  }

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch('/api/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: form.templateType,
          slug: form.slug.trim().toLowerCase(),
          displayNameAr: form.displayNameAr.trim(),
          displayNameEn: form.displayNameEn.trim(),
          adminEmail: form.adminEmail.trim() || undefined,
          adminPassword: form.adminPassword || undefined,
          secrets: {
            supabaseUrl: form.supabaseUrl.trim(),
            supabaseAnonKey: form.supabaseAnonKey.trim(),
            supabaseServiceRoleKey: form.supabaseServiceRoleKey.trim(),
            supabaseDbPassword: form.supabaseDbPassword,
            supabaseAccessToken: form.supabaseAccessToken.trim(),
            supabaseProjectRef: form.supabaseProjectRef.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.formErrors?.join?.(', ') || data.error || 'Provision failed');
      }
      toast.success('Provisioning started');
      if (data.adminPassword) {
        sessionStorage.setItem(
          `engaz-handoff-${data.customerId}`,
          JSON.stringify({ email: data.adminEmail, password: data.adminPassword })
        );
      }
      router.push(`/customers/${data.customerId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">New customer</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Clone a template, migrate an empty menu, create admin, deploy to Vercel.
        </p>
      </div>

      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded-md border px-3 py-2 text-center text-xs font-medium ${
              i === step
                ? 'border-primary bg-accent text-accent-foreground'
                : 'bg-card text-muted-foreground'
            }`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
          <CardDescription>
            {step === 0 && 'Choose the source branch / business type.'}
            {step === 1 && 'Slug becomes git branch and {slug}.vercel.app.'}
            {step === 2 &&
              'Paste credentials from the customer Supabase project you already created.'}
            {step === 3 && 'Confirm and start the provisioner job.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <div className="grid gap-3">
              {(Object.keys(TEMPLATE_CONFIGS) as TemplateType[]).map((id) => {
                const t = TEMPLATE_CONFIGS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => update('templateType', id)}
                    className={`rounded-md border px-4 py-3 text-left transition ${
                      form.templateType === id
                        ? 'border-primary bg-accent'
                        : 'bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className="font-medium">{t.label}</div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      Branch `{t.sourceBranch}` · QR {t.qrTargetPath} ·{' '}
                      {t.fulfillmentMode === 'delivery_only'
                        ? 'delivery only'
                        : 'dine-in / takeaway / delivery'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  placeholder="newcustomer"
                  value={form.slug}
                  onChange={(e) =>
                    update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Production URL will be https://{form.slug || 'slug'}.vercel.app
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="en">Display name (EN)</Label>
                <Input
                  id="en"
                  value={form.displayNameEn}
                  onChange={(e) => update('displayNameEn', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ar">Display name (AR)</Label>
                <Input
                  id="ar"
                  dir="rtl"
                  value={form.displayNameAr}
                  onChange={(e) => update('displayNameAr', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin email (optional)</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder={`admin@${form.slug || 'slug'}.com`}
                  value={form.adminEmail}
                  onChange={(e) => update('adminEmail', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">
                  Admin password (optional — auto-generated if empty)
                </Label>
                <Input
                  id="adminPassword"
                  type="text"
                  value={form.adminPassword}
                  onChange={(e) => update('adminPassword', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Project ref</Label>
                <Input
                  placeholder="abcdefghijklmnop"
                  value={form.supabaseProjectRef}
                  onChange={(e) => update('supabaseProjectRef', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Project URL</Label>
                <Input
                  placeholder="https://xxxx.supabase.co"
                  value={form.supabaseUrl}
                  onChange={(e) => update('supabaseUrl', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Anon key</Label>
                <Textarea
                  rows={2}
                  value={form.supabaseAnonKey}
                  onChange={(e) => update('supabaseAnonKey', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Service role key</Label>
                <Textarea
                  rows={2}
                  value={form.supabaseServiceRoleKey}
                  onChange={(e) => update('supabaseServiceRoleKey', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>DB password</Label>
                <Input
                  type="password"
                  value={form.supabaseDbPassword}
                  onChange={(e) => update('supabaseDbPassword', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Personal access token (Management API)</Label>
                <Input
                  type="password"
                  value={form.supabaseAccessToken}
                  onChange={(e) => update('supabaseAccessToken', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4 border-b py-2">
                <dt className="text-muted-foreground">Template</dt>
                <dd>{TEMPLATE_CONFIGS[form.templateType].label}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b py-2">
                <dt className="text-muted-foreground">Slug / branch</dt>
                <dd className="font-mono">{form.slug}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b py-2">
                <dt className="text-muted-foreground">Names</dt>
                <dd>
                  {form.displayNameEn} / {form.displayNameAr}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b py-2">
                <dt className="text-muted-foreground">Supabase</dt>
                <dd className="font-mono text-xs">{form.supabaseProjectRef}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Prod URL</dt>
                <dd>https://{form.slug}.vercel.app</dd>
              </div>
            </dl>
          )}

          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0 || loading}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </Button>
            {step < 3 ? (
              <Button type="button" onClick={next}>
                Continue
              </Button>
            ) : (
              <Button type="button" disabled={loading} onClick={submit}>
                {loading ? 'Starting…' : 'Start provisioning'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
