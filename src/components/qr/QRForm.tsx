'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { qrCodeSchema, type QrCodeInput } from '@/types/schema';
import type { z } from 'zod';
import type { QrCode, RestaurantTable } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TemplateSwitcher } from './TemplateSwitcher';
import { QRPreview } from './QRPreview';
import { getTemplate } from '@/lib/qr/templates';
import { buildWelcomeUrl } from '@/lib/qr/welcome-url';
import { Loader2, RefreshCw } from 'lucide-react';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { buildQRFilename } from '@/lib/qr/logo-overlay';

function getSiteUrl(): string {
  if (typeof window !== 'undefined') {
    return (
      process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    );
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://engzqrmenu.vercel.app'
  );
}

function generateMenuUrl(tableNumber?: number | null): string {
  return buildWelcomeUrl(getSiteUrl(), tableNumber);
}

function getTableNumberByValue(tables: RestaurantTable[], value: string): number | null {
  const table = tables.find((t) => t.id === value);
  return table?.table_number ?? null;
}

interface QRFormProps {
  initialData?: QrCode;
  tables: RestaurantTable[];
  onSubmit: (data: QrCodeInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function QRForm({ initialData, tables, onSubmit, onCancel, isLoading }: QRFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof qrCodeSchema>>({
    resolver: zodResolver(qrCodeSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          url: initialData.url,
          foreground_color: initialData.foreground_color,
          background_color: initialData.background_color,
          logo_url: initialData.logo_url,
          template: initialData.template as z.input<typeof qrCodeSchema>['template'],
          size: initialData.size,
          primary_color: initialData.primary_color,
          secondary_color: initialData.secondary_color,
          rounded_style: initialData.rounded_style as 'square' | 'rounded' | 'circle',
          eye_style: initialData.eye_style as 'square' | 'rounded' | 'circle',
          margin: initialData.margin,
          error_correction: initialData.error_correction as 'L' | 'M' | 'Q' | 'H',
          table_id: initialData.table_id,
          is_active: initialData.is_active,
        }
      : {
          name: '',
          url: generateMenuUrl(),
          template: 'classic',
          size: 300,
          primary_color: '#000000',
          secondary_color: '#B8860B',
          foreground_color: '#000000',
          background_color: '#FFFFFF',
          rounded_style: 'square',
          eye_style: 'square',
          margin: 4,
          error_correction: 'M',
          is_active: true,
        },
  });

  const watched = watch();
  const watchedTableId = watched.table_id;
  const watchedUrl = watched.url;

  const tmpl = getTemplate(watched.template || 'classic');
  const t = useTranslations('qr');
  const tCommon = useTranslations('common');
  const { data: settings } = useRestaurantSettings();
  const restaurantLogoUrl = settings?.logo_url ?? null;
  const [includeLogo, setIncludeLogo] = useState(
    Boolean(initialData?.logo_url && initialData.logo_url === restaurantLogoUrl)
  );

  const selectedTableNumber =
    watchedTableId && watchedTableId !== 'none'
      ? getTableNumberByValue(tables, watchedTableId)
      : null;

  const previewLogoUrl = includeLogo && restaurantLogoUrl ? restaurantLogoUrl : undefined;

  const downloadFilename = buildQRFilename({
    restaurantName: settings?.name_en,
    qrName: watched.name,
    tableNumber: selectedTableNumber,
  });

  useEffect(() => {
    if (initialData?.logo_url && restaurantLogoUrl) {
      setIncludeLogo(initialData.logo_url === restaurantLogoUrl);
    }
  }, [initialData?.logo_url, restaurantLogoUrl]);

  useEffect(() => {
    if (includeLogo && restaurantLogoUrl) {
      setValue('logo_url', restaurantLogoUrl, { shouldValidate: true });
      setValue('error_correction', 'H', { shouldValidate: true });
    } else {
      setValue('logo_url', null, { shouldValidate: true });
    }
  }, [includeLogo, restaurantLogoUrl, setValue]);

  useEffect(() => {
    if (!initialData) {
      setValue('foreground_color', tmpl.fgColor);
      setValue('background_color', tmpl.bgColor);
      setValue('primary_color', tmpl.primaryColor);
      setValue('secondary_color', tmpl.secondaryColor);
      setValue('rounded_style', tmpl.roundedStyle);
      setValue('eye_style', tmpl.eyeStyle);
    }
  }, [watched.template, tmpl, initialData, setValue]);

  const autoUrl = useMemo(() => {
    if (watchedTableId && watchedTableId !== 'none') {
      const tableNum = getTableNumberByValue(tables, watchedTableId);
      if (tableNum != null) {
        return generateMenuUrl(tableNum);
      }
    }
    return generateMenuUrl();
  }, [watchedTableId, tables]);

  const handleResetUrl = () => {
    setValue('url', autoUrl, { shouldValidate: true });
  };

  useEffect(() => {
    if (watchedTableId && watchedTableId !== 'none') {
      const tableNum = getTableNumberByValue(tables, watchedTableId);
      if (tableNum != null) {
        const newUrl = generateMenuUrl(tableNum);
        if (watchedUrl !== newUrl) {
          setValue('url', newUrl, { shouldValidate: true });
        }
      }
    } else {
      const baseUrl = generateMenuUrl();
      if (watchedUrl !== baseUrl) {
        setValue('url', baseUrl, { shouldValidate: true });
      }
    }
  }, [watchedTableId, tables, setValue, watchedUrl]);

  const previewUrl = watchedUrl || autoUrl;

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data as QrCodeInput))}
      className="flex flex-col gap-6 lg:grid lg:grid-cols-2"
    >
      <div className="order-2 space-y-4 lg:order-1">
        <div className="space-y-2">
          <Label htmlFor="name">{t('qrName')} *</Label>
          <Input id="name" {...register('name')} placeholder={t('qrNamePlaceholder')} />
          {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="url">{t('menuUrl')} *</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetUrl}
              className="h-7 gap-1 text-xs"
            >
              <RefreshCw className="h-3 w-3" />
              {t('auto')}
            </Button>
          </div>
          <Input id="url" value={autoUrl} readOnly className="bg-muted font-mono text-sm" />
          <input type="hidden" {...register('url')} />
          {errors.url && <p className="text-destructive text-sm">{errors.url.message}</p>}
          {watchedTableId && watchedTableId !== 'none' && (
            <p className="text-muted-foreground text-xs">
              {t('includesTable')}{' '}
              <span className="font-mono">
                ?table={getTableNumberByValue(tables, watchedTableId)}
              </span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="table_id">
            {tCommon('optional')} ({t('table')})
          </Label>
          <Select
            value={watchedTableId || ''}
            onValueChange={(val) => {
              const newTableId = val === 'none' ? null : val;
              setValue('table_id', newTableId, { shouldValidate: true });
              const tableNum =
                newTableId && newTableId !== 'none'
                  ? getTableNumberByValue(tables, newTableId)
                  : null;
              const newUrl = generateMenuUrl(tableNum);
              setValue('url', newUrl, { shouldValidate: true });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('noTableSelected')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('noTable')}</SelectItem>
              {tables.map((table) => (
                <SelectItem key={table.id} value={table.id}>
                  {t('tableNumber', { number: table.table_number })}
                  {table.internal_name ? ` - ${table.internal_name}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TemplateSwitcher
          value={watched.template || 'classic'}
          onChange={(tmpl) =>
            setValue('template', tmpl as z.input<typeof qrCodeSchema>['template'])
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="foreground_color">{t('foreground')}</Label>
            <div className="flex gap-2">
              <Input
                id="foreground_color"
                type="color"
                {...register('foreground_color')}
                className="h-10 w-14 cursor-pointer p-1"
              />
              <Input {...register('foreground_color')} className="font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="background_color">{t('background')}</Label>
            <div className="flex gap-2">
              <Input
                id="background_color"
                type="color"
                {...register('background_color')}
                className="h-10 w-14 cursor-pointer p-1"
              />
              <Input {...register('background_color')} className="font-mono" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rounded_style">{t('roundedStyle')}</Label>
            <Select
              value={watched.rounded_style}
              onValueChange={(val) =>
                setValue('rounded_style', val as 'square' | 'rounded' | 'circle')
              }
            >
              <SelectTrigger id="rounded_style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square">{t('square')}</SelectItem>
                <SelectItem value="rounded">{t('rounded')}</SelectItem>
                <SelectItem value="circle">{t('circle')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eye_style">{t('eyeStyle')}</Label>
            <Select
              value={watched.eye_style}
              onValueChange={(val) => setValue('eye_style', val as 'square' | 'rounded' | 'circle')}
            >
              <SelectTrigger id="eye_style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square">{t('square')}</SelectItem>
                <SelectItem value="rounded">{t('rounded')}</SelectItem>
                <SelectItem value="circle">{t('circle')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="margin">{t('margin')}</Label>
            <Input
              id="margin"
              type="number"
              min={0}
              max={10}
              {...register('margin', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="error_correction">{t('errorCorrection')}</Label>
            <Select
              value={watched.error_correction}
              onValueChange={(val) => setValue('error_correction', val as 'L' | 'M' | 'Q' | 'H')}
            >
              <SelectTrigger id="error_correction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L">{t('low')}</SelectItem>
                <SelectItem value="M">{t('medium')}</SelectItem>
                <SelectItem value="Q">{t('quartile')}</SelectItem>
                <SelectItem value="H">{t('high')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="size">{t('size')}</Label>
          <Input
            id="size"
            type="number"
            min={100}
            max={1000}
            {...register('size', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="include_logo">{t('includeLogo')}</Label>
              <p className="text-muted-foreground text-xs">
                {restaurantLogoUrl ? t('includeLogoHint') : t('noRestaurantLogo')}
              </p>
            </div>
            <Switch
              id="include_logo"
              checked={includeLogo}
              disabled={!restaurantLogoUrl}
              onCheckedChange={setIncludeLogo}
            />
          </div>
          {includeLogo && restaurantLogoUrl && (
            <p className="text-muted-foreground text-xs">{t('logoUsesHighCorrection')}</p>
          )}
          <input type="hidden" {...register('logo_url')} />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="is_active"
            checked={watched.is_active}
            onCheckedChange={(val) => setValue('is_active', val)}
          />
          <Label htmlFor="is_active">{tCommon('active')}</Label>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? t('editQR') : t('createQR')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {tCommon('cancel')}
          </Button>
        </div>
      </div>

      <div className="relative order-1 flex justify-center lg:sticky lg:top-24 lg:order-2 lg:items-start">
        <QRPreview
          url={previewUrl}
          template={watched.template}
          fgColor={watched.foreground_color}
          bgColor={watched.background_color}
          primaryColor={watched.primary_color}
          secondaryColor={watched.secondary_color}
          size={watched.size}
          roundedStyle={watched.rounded_style}
          eyeStyle={watched.eye_style}
          margin={watched.margin}
          errorCorrection={watched.error_correction}
          logoUrl={previewLogoUrl}
          filename={downloadFilename}
          showDownload
          showTemplateLabel
        />
      </div>
    </form>
  );
}
