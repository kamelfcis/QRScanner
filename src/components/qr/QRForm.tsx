'use client';

import { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';

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
          url: '',
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

  const tmpl = getTemplate(watched.template || 'classic');

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

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data as QrCodeInput))} className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">QR Code Name *</Label>
          <Input id="name" {...register('name')} placeholder="e.g., Main Entrance QR" />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">Menu URL *</Label>
          <Input id="url" {...register('url')} placeholder="https://wardashamya.com/menu" />
          {errors.url && <p className="text-sm text-destructive">{errors.url.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="table_id">Table (Optional)</Label>
          <Select
            value={watched.table_id || ''}
            onValueChange={(val) => setValue('table_id', val || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="No table" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No table</SelectItem>
              {tables.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  Table {t.table_number}{t.internal_name ? ` - ${t.internal_name}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TemplateSwitcher
          value={watched.template || 'classic'}
          onChange={(t) => setValue('template', t as z.input<typeof qrCodeSchema>['template'])}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="foreground_color">Foreground</Label>
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
            <Label htmlFor="background_color">Background</Label>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rounded_style">Rounded Style</Label>
            <Select
              value={watched.rounded_style}
              onValueChange={(val) => setValue('rounded_style', val as 'square' | 'rounded' | 'circle')}
            >
              <SelectTrigger id="rounded_style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square">Square</SelectItem>
                <SelectItem value="rounded">Rounded</SelectItem>
                <SelectItem value="circle">Circle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eye_style">Eye Style</Label>
            <Select
              value={watched.eye_style}
              onValueChange={(val) => setValue('eye_style', val as 'square' | 'rounded' | 'circle')}
            >
              <SelectTrigger id="eye_style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square">Square</SelectItem>
                <SelectItem value="rounded">Rounded</SelectItem>
                <SelectItem value="circle">Circle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="margin">Margin</Label>
            <Input
              id="margin"
              type="number"
              min={0}
              max={10}
              {...register('margin', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="error_correction">Error Correction</Label>
            <Select
              value={watched.error_correction}
              onValueChange={(val) => setValue('error_correction', val as 'L' | 'M' | 'Q' | 'H')}
            >
              <SelectTrigger id="error_correction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L">Low (7%)</SelectItem>
                <SelectItem value="M">Medium (15%)</SelectItem>
                <SelectItem value="Q">Quartile (25%)</SelectItem>
                <SelectItem value="H">High (30%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="size">Size (px)</Label>
          <Input
            id="size"
            type="number"
            min={100}
            max={1000}
            {...register('size', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo_url">Logo URL (Optional)</Label>
          <Input id="logo_url" {...register('logo_url')} placeholder="https://..." />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="is_active"
            checked={watched.is_active}
            onCheckedChange={(val) => setValue('is_active', val)}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Update QR Code' : 'Create QR Code'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>

      <div className="flex items-start justify-center">
        <QRPreview
          url={watched.url || 'https://wardashamya.com/menu'}
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
          logoUrl={watched.logo_url ?? undefined}
          showTemplateLabel
          className="sticky top-24"
        />
      </div>
    </form>
  );
}
