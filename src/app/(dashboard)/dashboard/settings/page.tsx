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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { Save, Upload, X } from 'lucide-react';
import { uploadImage, deleteImage, generateStoragePath } from '@/lib/upload';
import { isValidHexColor } from '@/lib/theme';
import type { RestaurantSettings, HoursSettings, ThemeSettings } from '@/types';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { ChangePasswordForm } from '@/components/dashboard/settings/ChangePasswordForm';
import { resolveOrderModes, validateOrderModes } from '@/lib/order/order-modes';

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

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
  primary_color: '#FFB700',
  secondary_color: '#6B0F1A',
  accent_color: '#FFB700',
  background_color: '#FAF8F5',
};

export default function SettingsPage() {
  const { data: settings, isLoading, error, refetch } = useRestaurantSettings();
  const { data: hours } = useHoursSettings();
  const { data: theme } = useThemeSettings();
  const updateSettings = useUpdateRestaurantSettings();
  const updateHours = useUpdateHoursSettings();
  const updateTheme = useUpdateThemeSettings();
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const tDays = useTranslations('days');

  const [form, setForm] = useState<Partial<RestaurantSettings>>({});
  const [hoursForm, setHoursForm] = useState<HoursSettings>(DEFAULT_HOURS);
  const [themeForm, setThemeForm] = useState<ThemeSettings>(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingStory, setUploadingStory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const storyFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate form from query
      setForm(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (hours) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate hours from query
      setHoursForm(hours);
    }
  }, [hours]);

  useEffect(() => {
    if (theme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate theme from query
      setThemeForm(theme);
    }
  }, [theme]);

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!form.name_en?.trim()) errs.push(t('validation.nameEnRequired'));
    if (!form.name_ar?.trim()) errs.push(t('validation.nameArRequired'));
    if (form.tax_rate !== undefined && (form.tax_rate < 0 || form.tax_rate > 100))
      errs.push(t('validation.taxRateRange'));
    if (
      form.service_charge_rate !== undefined &&
      (form.service_charge_rate < 0 || form.service_charge_rate > 100)
    )
      errs.push(t('validation.serviceChargeRange'));
    if (
      form.prep_time_minutes !== undefined &&
      (form.prep_time_minutes < 0 || form.prep_time_minutes > 240)
    )
      errs.push(t('validation.prepTimeRange'));
    if (form.minimum_order !== undefined && form.minimum_order < 0)
      errs.push(t('validation.minimumOrderRange'));
    if (
      form.max_order_notes_length !== undefined &&
      (form.max_order_notes_length < 0 || form.max_order_notes_length > 1000)
    )
      errs.push(t('validation.maxNotesRange'));
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.push(t('validation.invalidEmail'));
    if (!validateOrderModes(resolveOrderModes(form))) errs.push(t('validation.orderModeRequired'));
    (['primary_color', 'secondary_color', 'accent_color', 'background_color'] as const).forEach(
      (key) => {
        const color = themeForm[key];
        if (color && !isValidHexColor(color)) {
          errs.push(
            t('validation.invalidColor', {
              field: t(
                key === 'primary_color'
                  ? 'primaryColor'
                  : key === 'secondary_color'
                    ? 'secondaryColor'
                    : key === 'accent_color'
                      ? 'accentColor'
                      : 'backgroundColor'
              ),
            })
          );
        }
      }
    );
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
      setErrors([err instanceof Error ? err.message : t('uploadFailed')]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogoRemove = () => {
    setForm((prev) => ({ ...prev, logo_url: null }));
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    try {
      if (form.hero_image_url) {
        const oldPath = form.hero_image_url.split('/covers/')[1];
        if (oldPath) await deleteImage('covers', oldPath).catch(() => {});
      }
      const path = generateStoragePath('covers', file.name);
      const result = await uploadImage({ bucket: 'covers', path, file });
      setForm((prev) => ({ ...prev, hero_image_url: result.url }));
    } catch (err) {
      setErrors([err instanceof Error ? err.message : t('heroUploadFailed')]);
    } finally {
      setUploadingHero(false);
      if (heroFileInputRef.current) heroFileInputRef.current.value = '';
    }
  };

  const handleHeroRemove = () => {
    setForm((prev) => ({ ...prev, hero_image_url: null }));
  };

  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingStory(true);
    try {
      if (form.story_image_url) {
        const oldPath = form.story_image_url.split('/covers/')[1];
        if (oldPath) await deleteImage('covers', oldPath).catch(() => {});
      }
      const path = generateStoragePath('covers', file.name);
      const result = await uploadImage({ bucket: 'covers', path, file });
      setForm((prev) => ({ ...prev, story_image_url: result.url }));
    } catch (err) {
      setErrors([err instanceof Error ? err.message : t('storyUploadFailed')]);
    } finally {
      setUploadingStory(false);
      if (storyFileInputRef.current) storyFileInputRef.current.value = '';
    }
  };

  const handleStoryRemove = () => {
    setForm((prev) => ({ ...prev, story_image_url: null }));
  };

  const handleHoursChange = (
    day: string,
    field: 'open' | 'close' | 'closed',
    value: string | boolean
  ) => {
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
          <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="self-start">
          <Save className="mr-2 h-4 w-4" />
          {saving ? t('saving') : t('saveChanges')}
        </Button>
      </div>

      {errors.length > 0 && (
        <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          <ul className="list-inside list-disc">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">{t('general')}</TabsTrigger>
          <TabsTrigger value="hero">{t('hero')}</TabsTrigger>
          <TabsTrigger value="contact">{t('contact')}</TabsTrigger>
          <TabsTrigger value="hours">{t('hours')}</TabsTrigger>
          <TabsTrigger value="theme">{t('theme')}</TabsTrigger>
          <TabsTrigger value="business">{t('business')}</TabsTrigger>
          <TabsTrigger value="account">{t('account')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('restaurantInfo')}</CardTitle>
              <CardDescription>{t('basicInfo')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <div className="space-y-2">
                  <Label>{t('logo')}</Label>
                  <div className="flex items-center gap-3">
                    {form.logo_url ? (
                      <div className="bg-muted relative h-20 w-20 overflow-hidden rounded-lg border">
                        <img
                          src={form.logo_url}
                          alt={t('restaurantLogo')}
                          className="h-full w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={handleLogoRemove}
                          className="bg-destructive text-destructive-foreground absolute right-1 top-1 rounded-full p-0.5"
                          aria-label={t('removeLogo')}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="bg-muted/50 text-muted-foreground hover:border-primary/50 hover:bg-muted flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors"
                      >
                        <Upload className="mb-1 h-5 w-5" />
                        <span className="text-xs">{uploading ? '...' : t('uploadLogo')}</span>
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
                        {uploading ? tCommon('uploading') : t('changeLogo')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name_en">{t('nameEn')}</Label>
                  <Input
                    id="name_en"
                    value={form.name_en || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, name_en: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_ar">{t('nameAr')}</Label>
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
                  <Label htmlFor="tagline">{t('tagline')}</Label>
                  <Input
                    id="tagline"
                    value={form.tagline || ''}
                    placeholder={t('taglinePlaceholder')}
                    onChange={(e) => setForm((prev) => ({ ...prev, tagline: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hero" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('heroSection')}</CardTitle>
              <CardDescription>{t('heroDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('heroImage')}</Label>
                <p className="text-muted-foreground text-sm">{t('heroImageDescription')}</p>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  {form.hero_image_url ? (
                    <div className="bg-muted relative h-32 w-full max-w-md overflow-hidden rounded-lg border sm:h-28">
                      <img
                        src={form.hero_image_url}
                        alt={t('heroImageAlt')}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleHeroRemove}
                        className="bg-destructive text-destructive-foreground absolute right-2 top-2 rounded-full p-1"
                        aria-label={t('removeHeroImage')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => heroFileInputRef.current?.click()}
                      disabled={uploadingHero}
                      className="bg-muted/50 text-muted-foreground hover:border-primary/50 hover:bg-muted flex h-32 w-full max-w-md flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors"
                    >
                      <Upload className="mb-1 h-5 w-5" />
                      <span className="text-xs">
                        {uploadingHero ? '...' : t('uploadHeroImage')}
                      </span>
                    </button>
                  )}
                  <input
                    ref={heroFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleHeroUpload}
                    className="hidden"
                  />
                  {form.hero_image_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => heroFileInputRef.current?.click()}
                      disabled={uploadingHero}
                    >
                      {uploadingHero ? tCommon('uploading') : t('changeHeroImage')}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero_headline">{t('headline')}</Label>
                <Input
                  id="hero_headline"
                  value={form.hero_headline || ''}
                  placeholder={t('headlinePlaceholder')}
                  onChange={(e) => setForm((prev) => ({ ...prev, hero_headline: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero_subtitle">{t('subtitle')}</Label>
                <Input
                  id="hero_subtitle"
                  value={form.hero_subtitle || ''}
                  placeholder={t('subtitlePlaceholder')}
                  onChange={(e) => setForm((prev) => ({ ...prev, hero_subtitle: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('storySection')}</CardTitle>
              <CardDescription>{t('storyTextDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="story_title_en">{t('storyTitleEn')}</Label>
                  <Input
                    id="story_title_en"
                    value={form.story_title_en || ''}
                    placeholder={t('storyTitleEn')}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, story_title_en: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="story_title_ar">{t('storyTitleAr')}</Label>
                  <Input
                    id="story_title_ar"
                    value={form.story_title_ar || ''}
                    placeholder={t('storyTitleAr')}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, story_title_ar: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="story_p1_en">{t('storyP1En')}</Label>
                  <Textarea
                    id="story_p1_en"
                    value={form.story_p1_en || ''}
                    placeholder={t('storyP1En')}
                    rows={4}
                    onChange={(e) => setForm((prev) => ({ ...prev, story_p1_en: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="story_p1_ar">{t('storyP1Ar')}</Label>
                  <Textarea
                    id="story_p1_ar"
                    value={form.story_p1_ar || ''}
                    placeholder={t('storyP1Ar')}
                    rows={4}
                    onChange={(e) => setForm((prev) => ({ ...prev, story_p1_ar: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="story_p2_en">{t('storyP2En')}</Label>
                  <Textarea
                    id="story_p2_en"
                    value={form.story_p2_en || ''}
                    placeholder={t('storyP2En')}
                    rows={4}
                    onChange={(e) => setForm((prev) => ({ ...prev, story_p2_en: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="story_p2_ar">{t('storyP2Ar')}</Label>
                  <Textarea
                    id="story_p2_ar"
                    value={form.story_p2_ar || ''}
                    placeholder={t('storyP2Ar')}
                    rows={4}
                    onChange={(e) => setForm((prev) => ({ ...prev, story_p2_ar: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="story_title_fr">{t('storyTitleFr')}</Label>
                  <Input
                    id="story_title_fr"
                    value={form.story_title_fr || ''}
                    placeholder={t('storyTitleFr')}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, story_title_fr: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="story_title_nl">{t('storyTitleNl')}</Label>
                  <Input
                    id="story_title_nl"
                    value={form.story_title_nl || ''}
                    placeholder={t('storyTitleNl')}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, story_title_nl: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="story_p1_fr">{t('storyP1Fr')}</Label>
                  <Textarea
                    id="story_p1_fr"
                    value={form.story_p1_fr || ''}
                    placeholder={t('storyP1Fr')}
                    rows={4}
                    onChange={(e) => setForm((prev) => ({ ...prev, story_p1_fr: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="story_p1_nl">{t('storyP1Nl')}</Label>
                  <Textarea
                    id="story_p1_nl"
                    value={form.story_p1_nl || ''}
                    placeholder={t('storyP1Nl')}
                    rows={4}
                    onChange={(e) => setForm((prev) => ({ ...prev, story_p1_nl: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="story_p2_fr">{t('storyP2Fr')}</Label>
                  <Textarea
                    id="story_p2_fr"
                    value={form.story_p2_fr || ''}
                    placeholder={t('storyP2Fr')}
                    rows={4}
                    onChange={(e) => setForm((prev) => ({ ...prev, story_p2_fr: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="story_p2_nl">{t('storyP2Nl')}</Label>
                  <Textarea
                    id="story_p2_nl"
                    value={form.story_p2_nl || ''}
                    placeholder={t('storyP2Nl')}
                    rows={4}
                    onChange={(e) => setForm((prev) => ({ ...prev, story_p2_nl: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('storyImage')}</Label>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  {form.story_image_url ? (
                    <div className="bg-muted relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border">
                      <img
                        src={form.story_image_url}
                        alt={t('storyImageAlt')}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleStoryRemove}
                        className="bg-destructive text-destructive-foreground absolute right-2 top-2 rounded-full p-1"
                        aria-label={t('removeStoryImage')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => storyFileInputRef.current?.click()}
                      disabled={uploadingStory}
                      className="bg-muted/50 text-muted-foreground hover:border-primary/50 hover:bg-muted flex aspect-[4/3] w-full max-w-md flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors"
                    >
                      <Upload className="mb-1 h-5 w-5" />
                      <span className="text-xs">
                        {uploadingStory ? '...' : t('uploadStoryImage')}
                      </span>
                    </button>
                  )}
                  <input
                    ref={storyFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleStoryUpload}
                    className="hidden"
                  />
                  {form.story_image_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => storyFileInputRef.current?.click()}
                      disabled={uploadingStory}
                    >
                      {uploadingStory ? tCommon('uploading') : t('changeStoryImage')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('contactInfo')}</CardTitle>
              <CardDescription>{t('contactDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    dir="ltr"
                    className="unicode-bidi-plaintext"
                    value={form.phone || ''}
                    placeholder="+20 ..."
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">{t('whatsapp')}</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    dir="ltr"
                    className="unicode-bidi-plaintext"
                    value={form.whatsapp || ''}
                    placeholder="+20 ..."
                    onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                  />
                  <p className="text-muted-foreground text-xs">{t('whatsappPhoneHint')}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">{t('email')}</Label>
                <Input
                  id="contact_email"
                  type="email"
                  dir="ltr"
                  className="unicode-bidi-plaintext"
                  value={form.email || ''}
                  placeholder={t('emailPlaceholder')}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address_en">{t('addressEn')}</Label>
                  <Input
                    id="address_en"
                    value={form.address_en || ''}
                    placeholder={t('addressEnPlaceholder')}
                    onChange={(e) => setForm((prev) => ({ ...prev, address_en: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_ar">{t('addressAr')}</Label>
                  <Input
                    id="address_ar"
                    dir="rtl"
                    value={form.address_ar || ''}
                    placeholder={t('addressArPlaceholder')}
                    onChange={(e) => setForm((prev) => ({ ...prev, address_ar: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="google_maps_url">{t('googleMapsUrl')}</Label>
                <Input
                  id="google_maps_url"
                  value={form.google_maps_url || ''}
                  placeholder="https://maps.google.com/..."
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, google_maps_url: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="instagram">{t('instagram')}</Label>
                  <Input
                    id="instagram"
                    value={form.instagram || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, instagram: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">{t('facebook')}</Label>
                  <Input
                    id="facebook"
                    value={form.facebook || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, facebook: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok">{t('tiktok')}</Label>
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
              <CardTitle>{t('openingHours')}</CardTitle>
              <CardDescription>{t('openingHoursDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DAYS.map((day) => {
                const dayHours = hoursForm[day] || { open: '09:00', close: '23:00', closed: false };
                const isClosed = dayHours.closed ?? false;
                return (
                  <div
                    key={day}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="w-28 text-sm font-medium capitalize">{tDays(day)}</span>
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
                        <span className="text-muted-foreground">{tCommon('to')}</span>
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
                      <span className="text-muted-foreground text-sm italic">
                        {tCommon('disabled')}
                      </span>
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
              <CardTitle>{t('brandingTheme')}</CardTitle>
              <CardDescription>{t('themeDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4">
                <p className="mb-3 text-sm font-medium">{t('themePreview')}</p>
                <div className="flex flex-wrap gap-3">
                  {(
                    [
                      { key: 'primary_color', label: t('primaryColor') },
                      { key: 'secondary_color', label: t('secondaryColor') },
                      { key: 'accent_color', label: t('accentColor') },
                      { key: 'background_color', label: t('backgroundColor') },
                    ] as const
                  ).map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span
                        className="h-10 w-10 rounded-md border shadow-sm"
                        style={{ backgroundColor: themeForm[key] || DEFAULT_THEME[key] }}
                        aria-hidden
                      />
                      <div>
                        <p className="text-muted-foreground text-xs">{label}</p>
                        <p className="font-mono text-xs">{themeForm[key] || DEFAULT_THEME[key]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">{t('primaryColor')}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="primary_color"
                      type="color"
                      value={themeForm.primary_color || '#FFB700'}
                      onChange={(e) =>
                        setThemeForm((prev) => ({ ...prev, primary_color: e.target.value }))
                      }
                      className="h-10 w-10 cursor-pointer rounded border"
                    />
                    <Input
                      value={themeForm.primary_color || '#FFB700'}
                      onChange={(e) =>
                        setThemeForm((prev) => ({ ...prev, primary_color: e.target.value }))
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">{t('secondaryColor')}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="secondary_color"
                      type="color"
                      value={themeForm.secondary_color || '#6B0F1A'}
                      onChange={(e) =>
                        setThemeForm((prev) => ({ ...prev, secondary_color: e.target.value }))
                      }
                      className="h-10 w-10 cursor-pointer rounded border"
                    />
                    <Input
                      value={themeForm.secondary_color || '#6B0F1A'}
                      onChange={(e) =>
                        setThemeForm((prev) => ({ ...prev, secondary_color: e.target.value }))
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accent_color">{t('accentColor')}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="accent_color"
                      type="color"
                      value={themeForm.accent_color || '#FFB700'}
                      onChange={(e) =>
                        setThemeForm((prev) => ({ ...prev, accent_color: e.target.value }))
                      }
                      className="h-10 w-10 cursor-pointer rounded border"
                    />
                    <Input
                      value={themeForm.accent_color || '#FFB700'}
                      onChange={(e) =>
                        setThemeForm((prev) => ({ ...prev, accent_color: e.target.value }))
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="background_color">{t('backgroundColor')}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="background_color"
                      type="color"
                      value={themeForm.background_color || '#FAF8F5'}
                      onChange={(e) =>
                        setThemeForm((prev) => ({ ...prev, background_color: e.target.value }))
                      }
                      className="h-10 w-10 cursor-pointer rounded border"
                    />
                    <Input
                      value={themeForm.background_color || '#FAF8F5'}
                      onChange={(e) =>
                        setThemeForm((prev) => ({ ...prev, background_color: e.target.value }))
                      }
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
              <CardTitle>{t('businessSettings')}</CardTitle>
              <CardDescription>{t('taxAndCurrency')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="currency">{t('currency')}</Label>
                  <Input
                    id="currency"
                    value={form.currency || 'SAR'}
                    onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">{t('taxRate')}</Label>
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
                  <Label htmlFor="service_charge">{t('serviceCharge')}</Label>
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

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="prep_time_minutes">{t('prepTime')}</Label>
                  <Input
                    id="prep_time_minutes"
                    type="number"
                    min="0"
                    max="240"
                    value={form.prep_time_minutes ?? 25}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        prep_time_minutes: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimum_order">{t('minimumOrder')}</Label>
                  <Input
                    id="minimum_order"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minimum_order ?? 0}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        minimum_order: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_order_notes_length">{t('maxOrderNotes')}</Label>
                  <Input
                    id="max_order_notes_length"
                    type="number"
                    min="0"
                    max="1000"
                    value={form.max_order_notes_length ?? 200}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        max_order_notes_length: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
                <div className="flex items-center gap-3">
                  <Switch
                    id="apply_tax"
                    checked={form.apply_tax !== false}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, apply_tax: checked }))
                    }
                  />
                  <Label htmlFor="apply_tax">{t('applyTax')}</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="apply_service_charge"
                    checked={form.apply_service_charge !== false}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, apply_service_charge: checked }))
                    }
                  />
                  <Label htmlFor="apply_service_charge">{t('applyServiceCharge')}</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('orderTypes')}</CardTitle>
              <CardDescription>{t('orderTypesDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_dine_in">{t('enableDineIn')}</Label>
                  <p className="text-muted-foreground text-sm">{t('enableDineInHint')}</p>
                </div>
                <Switch
                  id="enable_dine_in"
                  checked={form.enable_dine_in !== false}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, enable_dine_in: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_takeaway">{t('enableTakeaway')}</Label>
                  <p className="text-muted-foreground text-sm">{t('enableTakeawayHint')}</p>
                </div>
                <Switch
                  id="enable_takeaway"
                  checked={form.enable_takeaway !== false}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, enable_takeaway: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_delivery">{t('enableDelivery')}</Label>
                  <p className="text-muted-foreground text-sm">{t('enableDeliveryHint')}</p>
                </div>
                <Switch
                  id="enable_delivery"
                  checked={form.enable_delivery === true}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, enable_delivery: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <ChangePasswordForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
