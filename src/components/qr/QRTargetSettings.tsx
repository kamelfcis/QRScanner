'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRestaurantSettings, useUpdateRestaurantSettings } from '@/hooks/useSettings';
import { resolveQrUrlConfig, buildQrTargetUrl } from '@/lib/qr/welcome-url';
import { Loader2, Save } from 'lucide-react';
import { useTranslations } from '@/components/providers/RootI18nProvider';

export function QRTargetSettings() {
  const { data: settings } = useRestaurantSettings();
  const updateSettings = useUpdateRestaurantSettings();
  const t = useTranslations('qr');
  const tCommon = useTranslations('common');

  const [qrSiteUrl, setQrSiteUrl] = useState('');
  const [qrTargetPath, setQrTargetPath] = useState('/');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const config = resolveQrUrlConfig(settings);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate form from query
    setQrSiteUrl(settings.qr_site_url ?? '');
    setQrTargetPath(config.targetPath);
  }, [settings]);

  const previewConfig = resolveQrUrlConfig({
    qr_site_url: qrSiteUrl || null,
    qr_target_path: qrTargetPath || null,
  });
  const previewUrl = buildQrTargetUrl(previewConfig);

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      qr_site_url: qrSiteUrl.trim() || null,
      qr_target_path: qrTargetPath.trim() || null,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('targetSettingsTitle')}</CardTitle>
        <CardDescription>{t('targetSettingsDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="qr_site_url">{t('qrSiteUrl')}</Label>
            <Input
              id="qr_site_url"
              dir="ltr"
              className="unicode-bidi-plaintext font-mono text-sm"
              value={qrSiteUrl}
              onChange={(e) => setQrSiteUrl(e.target.value)}
              placeholder={previewConfig.siteUrl}
            />
            <p className="text-muted-foreground text-xs">{t('qrSiteUrlHint')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qr_target_path">{t('qrTargetPath')}</Label>
            <Input
              id="qr_target_path"
              dir="ltr"
              className="unicode-bidi-plaintext font-mono text-sm"
              value={qrTargetPath}
              onChange={(e) => setQrTargetPath(e.target.value)}
              placeholder="/"
            />
            <p className="text-muted-foreground text-xs">{t('qrTargetPathHint')}</p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-md border p-3">
          <p className="text-muted-foreground text-xs">{t('qrPreviewLabel')}</p>
          <p className="mt-1 break-all font-mono text-sm">{previewUrl}</p>
        </div>

        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saved ? tCommon('success') : t('saveTargetSettings')}
        </Button>
      </CardContent>
    </Card>
  );
}
