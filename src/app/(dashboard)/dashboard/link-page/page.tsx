'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import NextImage from 'next/image';
import { Copy, Save, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { LinkPageView } from '@/components/link-page/LinkPageView';
import { QRPreview } from '@/components/qr/QRPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import {
  useLinkPageSettings,
  useUpdateLinkPageSettings,
  useRestaurantSettings,
} from '@/hooks/useSettings';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { uploadImage, deleteImage, generateStoragePath } from '@/lib/upload';
import { mergeLinkPageSettings } from '@/lib/link-page/defaults';
import { OSTOL_LINKS_QR_TEMPLATE } from '@/lib/qr/templates';
import type { LinkPageOverlayStrength, LinkPageSettings } from '@/types';

const OVERLAY_PRESETS: LinkPageOverlayStrength[] = ['soft', 'medium', 'strong'];

type LinkKey = keyof LinkPageSettings['links'];

const LINK_KEYS: LinkKey[] = ['facebook', 'instagram', 'tiktok', 'phone', 'whatsapp', 'menu'];

function getLinksPageUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base.replace(/\/+$/, '')}/links`;
}

export default function LinkPageEditorPage() {
  const { data: saved, isLoading, error, refetch } = useLinkPageSettings();
  const { data: restaurant } = useRestaurantSettings();
  const updateSettings = useUpdateLinkPageSettings();
  const t = useTranslations('linkPageAdmin');
  const tCommon = useTranslations('common');

  const [form, setForm] = useState<LinkPageSettings>(() => mergeLinkPageSettings());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate form from query
      setForm(saved);
    }
  }, [saved]);

  const linksUrl = useMemo(() => getLinksPageUrl(), []);
  const logoUrl = form.logo_url || restaurant?.logo_url || undefined;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings.mutateAsync(form);
      toast.success(t('saved'));
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(linksUrl);
      toast.success(t('linkCopied'));
    } catch {
      toast.error(tCommon('error'));
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    try {
      if (form.logo_url) {
        const oldPath = form.logo_url.split('/logos/')[1];
        if (oldPath) await deleteImage('logos', oldPath).catch(() => undefined);
      }
      const path = generateStoragePath('logos', file.name);
      const result = await uploadImage({ bucket: 'logos', path, file });
      setForm((prev) => ({ ...prev, logo_url: result.url }));
    } catch {
      toast.error(t('uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const updateLink = (key: LinkKey, patch: Partial<LinkPageSettings['links'][LinkKey]>) => {
    setForm((prev) => ({
      ...prev,
      links: {
        ...prev.links,
        [key]: { ...prev.links[key], ...patch },
      },
    }));
  };

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState title={tCommon('error')} retry={() => refetch()} />;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('content')}</CardTitle>
              <CardDescription>{t('contentDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">{t('pageEnabled')}</Label>
                <Switch
                  id="enabled"
                  checked={form.enabled}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title_ar">{t('titleAr')}</Label>
                  <Input
                    id="title_ar"
                    value={form.title_ar}
                    onChange={(e) => setForm((prev) => ({ ...prev, title_ar: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title_en">{t('titleEn')}</Label>
                  <Input
                    id="title_en"
                    value={form.title_en}
                    onChange={(e) => setForm((prev) => ({ ...prev, title_en: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtitle_ar">{t('subtitleAr')}</Label>
                  <Input
                    id="subtitle_ar"
                    value={form.subtitle_ar}
                    onChange={(e) => setForm((prev) => ({ ...prev, subtitle_ar: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subtitle_en">{t('subtitleEn')}</Label>
                  <Input
                    id="subtitle_en"
                    value={form.subtitle_en}
                    onChange={(e) => setForm((prev) => ({ ...prev, subtitle_en: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('appearance')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="background">{t('backgroundColor')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="background"
                      type="color"
                      value={form.background}
                      onChange={(e) => setForm((prev) => ({ ...prev, background: e.target.value }))}
                      className="h-10 w-14 p-1"
                    />
                    <Input
                      value={form.background}
                      onChange={(e) => setForm((prev) => ({ ...prev, background: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="button_color">{t('buttonColor')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="button_color"
                      type="color"
                      value={form.button_color}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, button_color: e.target.value }))
                      }
                      className="h-10 w-14 p-1"
                    />
                    <Input
                      value={form.button_color}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, button_color: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="use_hero_background">{t('useHeroBackground')}</Label>
                <Switch
                  id="use_hero_background"
                  checked={form.use_hero_background !== false}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, use_hero_background: checked }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('overlayStrength')}</Label>
                <div className="flex gap-2">
                  {OVERLAY_PRESETS.map((strength) => (
                    <Button
                      key={strength}
                      type="button"
                      variant={
                        (form.overlay_strength ?? 'medium') === strength ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setForm((prev) => ({ ...prev, overlay_strength: strength }))}
                    >
                      {t(`overlay_${strength}`)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="motion_enabled">{t('motionEnabled')}</Label>
                <Switch
                  id="motion_enabled"
                  checked={form.motion_enabled !== false}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, motion_enabled: checked }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('buttonRadius')}</Label>
                <div className="flex gap-2">
                  {(['pill', 'rounded'] as const).map((radius) => (
                    <Button
                      key={radius}
                      type="button"
                      variant={form.button_radius === radius ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setForm((prev) => ({ ...prev, button_radius: radius }))}
                    >
                      {t(radius)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('logoOverride')}</Label>
                <div className="flex items-center gap-3">
                  {form.logo_url ? (
                    <NextImage
                      src={form.logo_url}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : null}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleLogoUpload(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    {uploading ? tCommon('saving') : t('uploadLogo')}
                  </Button>
                  {form.logo_url ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((prev) => ({ ...prev, logo_url: null }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('links')}</CardTitle>
              <CardDescription>{t('linksDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {LINK_KEYS.map((key) => {
                const item = form.links[key];
                const isUrlField = key === 'facebook' || key === 'instagram' || key === 'tiktok';
                const isValueField = key === 'phone' || key === 'whatsapp';
                return (
                  <div key={key} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <Label>{t(`link_${key}`)}</Label>
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={(checked) => updateLink(key, { enabled: checked })}
                      />
                    </div>
                    {isUrlField && item.enabled ? (
                      <Input
                        value={item.url || ''}
                        placeholder={t('urlPlaceholder')}
                        onChange={(e) => updateLink(key, { url: e.target.value })}
                      />
                    ) : null}
                    {isValueField && item.enabled ? (
                      <Input
                        value={item.value || ''}
                        placeholder={t('phonePlaceholder')}
                        onChange={(e) => updateLink(key, { value: e.target.value })}
                      />
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {saving ? tCommon('saving') : t('save')}
          </Button>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('preview')}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden rounded-lg border p-0">
              <div className="max-h-[520px] overflow-y-auto">
                <LinkPageView
                  settings={form}
                  restaurant={restaurant}
                  preview
                  className="min-h-[480px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('qrSection')}</CardTitle>
              <CardDescription>{t('qrDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Input readOnly value={linksUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="sm" onClick={handleCopyLink}>
                  <Copy className="mr-1 h-4 w-4" />
                  {t('copyLink')}
                </Button>
              </div>
              <QRPreview
                url={linksUrl}
                template={OSTOL_LINKS_QR_TEMPLATE}
                logoUrl={logoUrl}
                showDownload
                filename="ostol-links-qr"
                size={220}
                downloadSize={1024}
                errorCorrection="H"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
