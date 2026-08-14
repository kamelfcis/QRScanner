'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Image } from '@/components/shared/Image';
import { cn } from '@/lib/utils';

export type AiProductImageMode = 'generate' | 'enhance';

export interface AiProductImagePayload {
  name_ar?: string | null;
  name_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  category_name?: string | null;
  source_image_url?: string | null;
}

export interface AiCandidate {
  id: string;
  url: string;
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

function mapAiError(status: number, code: string | undefined, t: Translate): string {
  if (status === 503 || code === 'not_configured') return t('aiNotConfigured');
  if (code === 'name_required') return t('aiGenerateNeedsName');
  if (code === 'source_image_required') return t('aiEnhanceNeedsImage');
  if (code === 'unsupported_model') return t('aiImageUnsupported');
  return t('aiImageFailed');
}

export async function requestAiProductImages(
  mode: AiProductImageMode,
  payload: AiProductImagePayload,
  t: Translate
): Promise<AiCandidate[] | null> {
  try {
    const response = await fetch('/api/ai/product-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        mode,
        name_ar: payload.name_ar ?? '',
        name_en: payload.name_en ?? '',
        description_ar: payload.description_ar ?? '',
        description_en: payload.description_en ?? '',
        category_name: payload.category_name ?? '',
        source_image_url: payload.source_image_url ?? '',
      }),
    });

    const data = (await response.json().catch(() => null)) as {
      images?: AiCandidate[];
      error?: string;
      code?: string;
    } | null;

    if (!response.ok) {
      toast.error(mapAiError(response.status, data?.code, t));
      return null;
    }

    const nextImages = Array.isArray(data?.images) ? data.images : [];
    if (nextImages.length === 0) {
      toast.error(t('aiNoCandidates'));
      return null;
    }

    return nextImages;
  } catch {
    toast.error(t('aiImageFailed'));
    return null;
  }
}

interface AiProductImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AiProductImageMode;
  loading: boolean;
  images: AiCandidate[];
  onRegenerate: () => void;
  onUseImage: (url: string) => void | Promise<void>;
  t: Translate;
  tCommon: (key: string) => string;
}

export function AiProductImageDialog({
  open,
  onOpenChange,
  mode,
  loading,
  images,
  onRegenerate,
  onUseImage,
  t,
  tCommon,
}: AiProductImageDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selected = images.find((image) => image.id === selectedId) ?? images[0] ?? null;

  const handleUse = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await onUseImage(selected.url);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('aiImageFailed'));
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-full sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'enhance' ? t('aiImageTitleEnhance') : t('aiImageTitleGenerate')}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="aspect-square w-full rounded-md" />
            ))}
            <p className="text-muted-foreground col-span-2 flex items-center justify-center gap-2 pt-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('aiGenerating')}
            </p>
          </div>
        ) : images.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{t('aiNoCandidates')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {images.map((image, index) => {
              const isSelected = selected?.id === image.id;
              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedId(image.id)}
                  className={cn(
                    'border-border/60 bg-muted/20 relative aspect-square overflow-hidden rounded-md border transition-colors',
                    isSelected && 'ring-brand-accent ring-2 ring-offset-2'
                  )}
                  aria-label={t('aiCandidateAlt', { n: index + 1 })}
                  aria-pressed={isSelected}
                  disabled={busy}
                >
                  <Image
                    src={image.url}
                    alt={t('aiCandidateAlt', { n: index + 1 })}
                    fill
                    sizes="200px"
                    className="object-cover"
                    containerClassName="absolute inset-0"
                  />
                  {isSelected && (
                    <span className="bg-brand-accent text-on-accent absolute end-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {tCommon('cancel')}
          </Button>
          <Button type="button" variant="outline" onClick={onRegenerate} disabled={busy}>
            {loading ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t('aiGenerating')}
              </>
            ) : (
              t('aiRegenerate')
            )}
          </Button>
          <Button type="button" onClick={() => void handleUse()} disabled={busy || !selected}>
            {saving ? tCommon('saving') : t('aiUseThisImage')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
