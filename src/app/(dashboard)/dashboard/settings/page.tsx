'use client';

import { useState, useEffect, useRef } from 'react';
import {
  useRestaurantSettings,
  useUpdateRestaurantSettings,
  useHoursSettings,
  useUpdateHoursSettings,
  useThemeSettings,
  useUpdateThemeSettings,
} from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { Save, Upload, X } from 'lucide-react';
import { uploadImage, deleteImage, generateStoragePath } from '@/lib/upload';
import type { RestaurantSettings, HoursSettings, ThemeSettings } from '@/types';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const DEFAULT_HOURS: HoursSettings = {
  monday: { open: '09:00', close: '23:00', closed: false },
  tuesday: { open: '09:00', close: '23:00', closed: false },
  wednesday: { open: '09:00', close: '23:00', closed: false },
  thursday: { open: '09:00', close: '23:00', closed: false },
  friday: { open: '09:00', close: '23:00', closed: false },
  saturday: { open: '09:00', close: '23:00', closed: false },
  sunday: { open: '09:00', close: '23:00', closed: false },
};

const DEFAULT_THEME: ThemeSettings = {
  primary_color: '#C8963E',
  secondary_color: '#1a1a1a',
  accent_color: '#FFD700',
  background_color: '#ffffff',
};

export default function SettingsPage() {
  const { data: settings, isLoading, error, refetch } = useRestaurantSettings();
  const { data: hours } = useHoursSettings();
  const { data: theme } = useThemeSettings();
  const updateSettings = useUpdateRestaurantSettings();
  const updateHours = useUpdateHoursSettings();
  const updateTheme = useUpdateThemeSettings();

  const [form, setForm] = useState<Partial<RestaurantSettings>>({});
  const [hoursForm, setHoursForm] = useState<HoursSettings>(DEFAULT_HOURS);
  const [themeForm, setThemeForm] = useState<ThemeSettings>(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  useEffect(() => {
    if (hours) setHoursForm(hours);
  }, [hours]);

  useEffect(() => {
    if (theme) setThemeForm(theme);
  }, [theme]);

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!form.name_en?.trim()) errs.push('Restaurant name (English) is required.');
    if (!form.name_ar?.trim()) errs.push('Restaurant name (Arabic) is required.');
    if (form.tax_rate !== undefined && (form.tax_rate < 0 || form.tax_rate > 100))
      errs.push('Tax rate must be between 0 and 100.');
    if (form.service_charge_rate !== undefined && (form.service_charge_rate < 0 || form.service_charge_rate > 100))
      errs.push('Service charge must be between 0 and 100.');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.push('Please enter a valid email address.');
    return errs;
  };

  const handleSave = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;
    setSaving(true);
    try {
      await updateSettings.mutateAsync(form);
      await updateHours.mutateAsync(hoursForm);
      await updateTheme.mutateAsync(themeForm);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (form.logo_url) {
        const oldPath = form.logo_url.split('/logos/')[1];
        if (oldPath) await deleteImage('logos', oldPath).catch(() => {});
      }
      const path = generateStoragePath('logos', file.name);
      const result = await uploadImage({ bucket: 'logos', path, file });
      setForm((prev) => ({ ...prev, logo_url: result.url }));
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to upload logo']);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogoRemove = () => {
    setForm((prev) => ({ ...prev, logo_url: null }));
  };

  const handleHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setHoursForm((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
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
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Information</CardTitle>
              <CardDescription>Basic information about your restaurant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-3">
                    {form.logo_url ? (
                      <div className="relative h-20 w-20 overflow-hidden rounded-lg border bg-muted">
                        <img
                          src={form.logo_url}
                          alt="Restaurant logo"
                          className="h-full w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={handleLogoRemove}
                          className="absolute right-1 top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                          aria-label="Remove logo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted"
                      >
                        <Upload className="mb-1 h-5 w-5" />
                        <span className="text-xs">{uploading ? '...' : 'Upload'}</span>
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    {form.logo_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? 'Uploading...' : 'Change Logo'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name_en">Name (English)</Label>
                  <Input
                    id="name_en"
                    value={form.name_en || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, name_en: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_ar">Name (Arabic)</Label>
                  <Input
                    id="name_ar"
                    dir="rtl"
                    value={form.name_ar || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, name_ar: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={form.tagline || ''}
                    placeholder="e.g. A culinary journey through traditions"
                    onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email || ''}
                    placeholder="restaurant@example.com"
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hero" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
              <CardDescription>Customize the headline and subtitle displayed on the landing page hero section.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hero_headline">Headline</Label>
                <Input
                  id="hero_headline"
                  value={form.hero_headline || ''}
                  placeholder="e.g. Welcome to Warda Shamya"
                  onChange={(e) => setForm((prev) => ({ ...prev, hero_headline: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero_subtitle">Subtitle</Label>
                <Input
                  id="hero_subtitle"
                  value={form.hero_subtitle || ''}
                  placeholder="e.g. A culinary journey through Lebanese & Syrian traditions"
                  onChange={(e) => setForm((prev) => ({ ...prev, hero_subtitle: e.target.value }))}
                />
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
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    value={form.whatsapp || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address_en">Address (English)</Label>
                  <Input
                    id="address_en"
                    value={form.address_en || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, address_en: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_ar">Address (Arabic)</Label>
                  <Input
                    id="address_ar"
                    dir="rtl"
                    value={form.address_ar || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, address_ar: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="google_maps_url">Google Maps URL</Label>
                <Input
                  id="google_maps_url"
                  value={form.google_maps_url || ''}
                  placeholder="https://maps.google.com/..."
                  onChange={(e) => setForm((prev) => ({ ...prev, google_maps_url: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={form.instagram || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, instagram: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={form.facebook || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, facebook: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok">TikTok</Label>
                  <Input
                    id="tiktok"
                    value={form.tiktok || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, tiktok: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Opening Hours</CardTitle>
              <CardDescription>Set your restaurant&apos;s opening and closing times for each day.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DAYS.map((day) => {
                const dayHours = hoursForm[day] || { open: '09:00', close: '23:00', closed: false };
                const isClosed = dayHours.closed ?? false;
                return (
                  <div key={day} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <span className="w-28 capitalize font-medium text-sm">{day}</span>
                    <Switch
                      checked={!isClosed}
                      onCheckedChange={(checked) => handleHoursChange(day, 'closed', !checked)}
                      size="sm"
                      aria-label={`${day} open/closed`}
                    />
                    {!isClosed && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={dayHours.open || '09:00'}
                          onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                          className="w-32"
                          aria-label={`${day} opening time`}
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={dayHours.close || '23:00'}
                          onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                          className="w-32"
                          aria-label={`${day} closing time`}
                        />
                      </div>
                    )}
                    {isClosed && (
                      <span className="text-sm text-muted-foreground italic">Closed</span>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Colors</CardTitle>
              <CardDescription>Customize the look and feel of your restaurant website.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="primary_color"
                      type="color"
                      value={themeForm.primary_color || '#C8963E'}
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, primary_color: e.target.value }))}
                      className="h-10 w-10 cursor-pointer rounded border"
                    />
                    <Input
                      value={themeForm.primary_color || '#C8963E'}
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, primary_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="secondary_color"
                      type="color"
                      value={themeForm.secondary_color || '#1a1a1a'}
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, secondary_color: e.target.value }))}
                      className="h-10 w-10 cursor-pointer rounded border"
                    />
                    <Input
                      value={themeForm.secondary_color || '#1a1a1a'}
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, secondary_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accent_color">Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="accent_color"
                      type="color"
                      value={themeForm.accent_color || '#FFD700'}
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, accent_color: e.target.value }))}
                      className="h-10 w-10 cursor-pointer rounded border"
                    />
                    <Input
                      value={themeForm.accent_color || '#FFD700'}
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, accent_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="background_color">Background Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="background_color"
                      type="color"
                      value={themeForm.background_color || '#ffffff'}
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, background_color: e.target.value }))}
                      className="h-10 w-10 cursor-pointer rounded border"
                    />
                    <Input
                      value={themeForm.background_color || '#ffffff'}
                      onChange={(e) => setThemeForm((prev) => ({ ...prev, background_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
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
                    onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
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
