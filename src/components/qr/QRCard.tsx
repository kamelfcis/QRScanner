'use client';

import { useState } from 'react';
import type { QrCodeWithTable } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QRPreview } from './QRPreview';
import { MoreVertical, Eye, Pencil, Copy, Trash2, QrCode, Table } from 'lucide-react';
import { getTemplate } from '@/lib/qr/templates';
import { useTranslations } from '@/components/providers/RootI18nProvider';

interface QRCardProps {
  qr: QrCodeWithTable;
  onEdit: (qr: QrCodeWithTable) => void;
  onDelete: (qr: QrCodeWithTable) => void;
  onDuplicate: (qr: QrCodeWithTable) => void;
}

export function QRCard({ qr, onEdit, onDelete, onDuplicate }: QRCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const tmpl = getTemplate(qr.template);
  const t = useTranslations('qr');
  const tCommon = useTranslations('common');

  return (
    <>
      <Card className="group overflow-hidden transition-shadow hover:shadow-md">
        <div
          className="flex items-center justify-center p-6"
          style={{ backgroundColor: tmpl.bgColor }}
        >
          <QRPreview
            url={qr.url}
            template={qr.template}
            fgColor={qr.foreground_color}
            bgColor={qr.background_color}
            size={160}
            roundedStyle={qr.rounded_style as 'square' | 'rounded' | 'circle'}
            eyeStyle={qr.eye_style as 'square' | 'rounded' | 'circle'}
            margin={qr.margin}
            errorCorrection={qr.error_correction as 'L' | 'M' | 'Q' | 'H'}
            logoUrl={qr.logo_url ?? undefined}
          />
        </div>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold">{qr.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{qr.url}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('qrActions')} />}>
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowPreview(true)}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('previewDownload')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(qr)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {tCommon('edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(qr)}>
                  <Copy className="mr-2 h-4 w-4" />
                  {tCommon('duplicate')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(qr)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {tCommon('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              <QrCode className="mr-1 h-3 w-3" />
              {tmpl.label}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {qr.size}px
            </Badge>
            {qr.table && (
              <Badge variant="secondary" className="text-xs">
                <Table className="mr-1 h-3 w-3" />
                T{qr.table.table_number}
              </Badge>
            )}
            {!qr.is_active && (
              <Badge variant="destructive" className="text-xs">{tCommon('inactive')}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{qr.name}</DialogTitle>
          </DialogHeader>
          <QRPreview
            url={qr.url}
            template={qr.template}
            fgColor={qr.foreground_color}
            bgColor={qr.background_color}
            size={300}
            roundedStyle={qr.rounded_style as 'square' | 'rounded' | 'circle'}
            eyeStyle={qr.eye_style as 'square' | 'rounded' | 'circle'}
            margin={qr.margin}
            errorCorrection={qr.error_correction as 'L' | 'M' | 'Q' | 'H'}
            logoUrl={qr.logo_url ?? undefined}
            filename={qr.name.replace(/\s+/g, '-').toLowerCase()}
            showDownload
            showTemplateLabel
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
