'use client';

import { useState, useEffect } from 'react';
import { useRestaurantSettings, useUpdateRestaurantSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { Save } from 'lucide-react';
import type { RestaurantSettings } from '@/types';

export default function SettingsPage() {
  const { data: settings, isLoading, error, refetch } = useRestaurantSettings();
  const updateSettings = useUpdateRestaurantSettings();
  const [form, setForm] = useState<Partial<RestaurantSettings>>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!form.name_en?.trim()) errs.push('Restaurant name (English) is required.');
    if (!form.name_ar?.trim()) errs.push('Restaurant name (Arabic) is required.');
    if (form.tax_rate !== undefined && (form.tax_rate < 0 || form.tax_rate > 100)) errs.push('Tax rate must be between 0 and 100.');
    if (form.service_charge_rate !== undefined && (form.service_charge_rate < 0 || form.service_charge_rate > 100)) errs.push('Service charge must be between 0 and 100.');
    return errs;
  };

  const handleSave = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;
    setSaving(true);
    try {
      await updateSettings.mutateAsync(form);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Settings</h1>
          <p className="text-muted-foreground">Configure your restaurant details.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="self-start">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {errors.length > 0 && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <ul className="list-disc list-inside">
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Information</CardTitle>
              <CardDescription>Basic information about your restaurant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name_en">Name (English)</Label>
                  <Input
                    id="name_en"
                    value={form.name_en || ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name_en: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_ar">Name (Arabic)</Label>
                  <Input
                    id="name_ar"
                    dir="rtl"
                    value={form.name_ar || ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name_ar: e.target.value }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How customers can reach you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone || ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    value={form.whatsapp || ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, whatsapp: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address_en">Address (English)</Label>
                  <Input
                    id="address_en"
                    value={form.address_en || ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, address_en: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_ar">Address (Arabic)</Label>
                  <Input
                    id="address_ar"
                    dir="rtl"
                    value={form.address_ar || ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, address_ar: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={form.instagram || ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, instagram: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={form.facebook || ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, facebook: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok">TikTok</Label>
                  <Input
                    id="tiktok"
                    value={form.tiktok || ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, tiktok: e.target.value }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Settings</CardTitle>
              <CardDescription>Tax rates and currency settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={form.currency || 'SAR'}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, currency: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    min="0"
                    max="100"
                    value={form.tax_rate ?? 15}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        tax_rate: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service_charge">Service Charge (%)</Label>
                  <Input
                    id="service_charge"
                    type="number"
                    min="0"
                    max="100"
                    value={form.service_charge_rate ?? 10}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        service_charge_rate: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
