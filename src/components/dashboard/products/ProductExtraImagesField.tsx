'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GripVertical, Images, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  productGalleryKey,
  useDeleteProductGallery,
  useInsertProductGallery,
  useProductGallery,
  useReorderProductGallery,
} from '@/hooks/useProductGallery';
import { buildProductSlides, MAX_PRODUCT_SLIDES } from '@/lib/catalog/product-slides';
import { generateStoragePath, uploadImage, validateImageFile } from '@/lib/upload';
import type { ProductGallery } from '@/types';
import { cn } from '@/lib/utils';

type Translator = (key: string, values?: Record<string, string | number | Date>) => string;

export type ProductGalleryFlush = (productId: string) => Promise<void>;

interface StagedFile {
  key: string;
  file: File;
  previewUrl: string;
}

interface PendingUpload extends StagedFile {
  sortOrder: number;
}

interface ProductExtraImagesFieldProps {
  mode: 'create' | 'edit';
  productId?: string | null;
  coverUrl: string | null;
  onBusyChange?: (busy: boolean) => void;
  flushRef?: React.MutableRefObject<ProductGalleryFlush | null>;
  t: Translator;
}

function reorderList<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function ProductExtraImagesField({
  mode,
  productId,
  coverUrl,
  onBusyChange,
  flushRef,
  t,
}: ProductExtraImagesFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onBusyChangeRef = useRef(onBusyChange);
  const tRef = useRef(t);
  const inFlightRef = useRef(0);
  const stagedRef = useRef<StagedFile[]>([]);
  const loadErrorFor = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const insertGallery = useInsertProductGallery();
  const deleteGallery = useDeleteProductGallery();
  const reorderGallery = useReorderProductGallery();
  const insertRef = useRef(insertGallery.mutateAsync);
  const galleryQuery = useProductGallery(mode === 'edit' ? productId : null);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    onBusyChangeRef.current = onBusyChange;
    tRef.current = t;
    stagedRef.current = staged;
    insertRef.current = insertGallery.mutateAsync;
  }, [onBusyChange, t, staged, insertGallery.mutateAsync]);

  const bumpInFlight = (delta: number) => {
    inFlightRef.current = Math.max(0, inFlightRef.current + delta);
    const nextBusy = inFlightRef.current > 0;
    setBusy(nextBusy);
    onBusyChangeRef.current?.(nextBusy);
  };

  useEffect(() => {
    return () => {
      onBusyChangeRef.current?.(false);
      for (const item of stagedRef.current) URL.revokeObjectURL(item.previewUrl);
    };
  }, []);

  useEffect(() => {
    if (!galleryQuery.isError || !productId || loadErrorFor.current === productId) return;
    loadErrorFor.current = productId;
    toast.error(tRef.current('galleryLoadFailed'));
  }, [galleryQuery.isError, productId]);

  useEffect(() => {
    if (!flushRef || mode !== 'create') return;
    flushRef.current = async (nextProductId: string) => {
      const items = stagedRef.current;
      if (items.length === 0) return;
      bumpInFlight(items.length);
      await Promise.all(
        items.map(async (item, index) => {
          try {
            const path = generateStoragePath('products', item.file.name);
            const result = await uploadImage({ bucket: 'products', path, file: item.file });
            await insertRef.current({
              product_id: nextProductId,
              image_url: result.url,
              sort_order: index,
            });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : tRef.current('galleryUploadFailed'));
          } finally {
            bumpInFlight(-1);
          }
        })
      );
    };
    return () => {
      flushRef.current = null;
    };
  }, [flushRef, mode]);

  const serverRows = galleryQuery.data ?? [];

  const rows: Array<{ key: string; previewUrl: string; gallery?: ProductGallery }> =
    mode === 'edit'
      ? serverRows.map((row) => ({
          key: row.id,
          previewUrl: row.image_url,
          gallery: row,
        }))
      : staged.map((item) => ({ key: item.key, previewUrl: item.previewUrl }));

  const usedSlides = buildProductSlides(coverUrl, [
    ...rows.map((row, index) => ({
      image_url: row.previewUrl,
      sort_order: row.gallery?.sort_order ?? index,
      created_at: row.gallery?.created_at,
    })),
    ...pending.map((item, index) => ({
      image_url: item.previewUrl,
      sort_order: rows.length + index,
    })),
  ]).length;
  const room = Math.max(0, MAX_PRODUCT_SLIDES - usedSlides);

  const acceptFiles = (list: FileList | File[]) => {
    if (mode === 'edit' && inFlightRef.current > 0) return;
    const incoming = [...list];
    if (incoming.length === 0) return;
    if (room <= 0) {
      toast.error(t('galleryLimit', { max: MAX_PRODUCT_SLIDES }));
      return;
    }

    const valid: File[] = [];
    for (const file of incoming) {
      try {
        validateImageFile(file);
        valid.push(file);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('galleryUploadFailed'));
      }
    }
    if (valid.length > room) {
      toast.error(t('galleryLimit', { max: MAX_PRODUCT_SLIDES }));
    }
    const accepted = valid.slice(0, room);
    if (accepted.length === 0) return;

    if (mode === 'create') {
      setStaged((current) => [
        ...current,
        ...accepted.map((file) => ({
          key: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ]);
      return;
    }

    if (!productId) return;
    const start = (galleryQuery.data ?? []).length;
    const jobs: PendingUpload[] = accepted.map((file, index) => ({
      key: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      sortOrder: start + index,
    }));
    setPending((current) => [...current, ...jobs]);
    bumpInFlight(jobs.length);

    void Promise.all(
      jobs.map(async (job) => {
        try {
          const path = generateStoragePath('products', job.file.name);
          const result = await uploadImage({ bucket: 'products', path, file: job.file });
          await insertRef.current({
            product_id: productId,
            image_url: result.url,
            sort_order: job.sortOrder,
          });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('galleryUploadFailed'));
        } finally {
          URL.revokeObjectURL(job.previewUrl);
          setPending((current) => current.filter((item) => item.key !== job.key));
          bumpInFlight(-1);
        }
      })
    );
  };

  const removeStaged = (key: string) => {
    setStaged((current) => {
      const target = current.find((item) => item.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.key !== key);
    });
  };

  const removeRow = async (id: string) => {
    try {
      await deleteGallery.mutateAsync(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('galleryDeleteFailed'));
    }
  };

  const onDropReorder = async (fromKey: string, toKey: string) => {
    if (!fromKey || fromKey === toKey) return;
    if (mode === 'create') {
      setStaged((current) => {
        const fromIndex = current.findIndex((item) => item.key === fromKey);
        const toIndex = current.findIndex((item) => item.key === toKey);
        return reorderList(current, fromIndex, toIndex);
      });
      return;
    }
    const fromIndex = serverRows.findIndex((row) => row.id === fromKey);
    const toIndex = serverRows.findIndex((row) => row.id === toKey);
    const reordered = reorderList(serverRows, fromIndex, toIndex);
    if (reordered === serverRows) return;
    const galleryKey = productGalleryKey(productId);
    queryClient.setQueryData(galleryKey, reordered);
    try {
      await reorderGallery.mutateAsync(reordered.map((row) => row.id));
    } catch (err) {
      queryClient.setQueryData(galleryKey, serverRows);
      toast.error(err instanceof Error ? err.message : t('galleryReorderFailed'));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{t('extraImages')}</Label>
        <span className="text-muted-foreground text-xs">
          {t('galleryCount', { count: usedSlides, max: MAX_PRODUCT_SLIDES })}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">
        {t('extraImagesHint', { max: MAX_PRODUCT_SLIDES })}
      </p>
      <div
        className={cn(
          'rounded-md border border-dashed p-3 transition-colors',
          dragOver ? 'border-brand-accent bg-muted/40' : 'border-border'
        )}
        onDragOver={(event) => {
          if (![...event.dataTransfer.types].includes('Files')) return;
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          if (event.dataTransfer.files.length === 0) return;
          event.preventDefault();
          setDragOver(false);
          acceptFiles(event.dataTransfer.files);
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={room <= 0 || busy}
          >
            <Images className="mr-2 h-4 w-4" />
            {t('addExtraImages')}
          </Button>
          <span className="text-muted-foreground text-xs">{t('dropExtraImages')}</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) acceptFiles(event.target.files);
            event.target.value = '';
          }}
        />
        {mode === 'edit' && galleryQuery.isLoading ? (
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-20 w-20 shrink-0" />
            <Skeleton className="h-20 w-20 shrink-0" />
          </div>
        ) : null}
        {rows.length > 0 || pending.length > 0 ? (
          <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
            {rows.map((row, index) => (
              <div
                key={row.key}
                className="border-border relative h-20 w-20 shrink-0 overflow-hidden rounded-md border"
                onDragOver={(event) => {
                  if ([...event.dataTransfer.types].includes('Files')) return;
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDrop={(event) => {
                  if (event.dataTransfer.files.length > 0) return;
                  event.preventDefault();
                  event.stopPropagation();
                  void onDropReorder(event.dataTransfer.getData('text/plain'), row.key);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.previewUrl}
                  alt={t('extraImageAlt', { index: index + 1 })}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  draggable
                  aria-label={t('dragToReorder')}
                  className="bg-background/80 absolute start-1 top-1 flex size-6 cursor-grab items-center justify-center rounded-sm"
                  onDragStart={(event) => {
                    event.stopPropagation();
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', row.key);
                  }}
                >
                  <GripVertical className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={t('removeExtraImage')}
                  className="bg-background/80 absolute end-1 top-1 flex size-6 items-center justify-center rounded-sm"
                  onClick={() => {
                    if (mode === 'create') removeStaged(row.key);
                    else void removeRow(row.key);
                  }}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {pending.map((item) => (
              <div
                key={item.key}
                className="border-border relative h-20 w-20 shrink-0 overflow-hidden rounded-md border"
              >
                <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt=""
                  className="h-full w-full object-cover opacity-40"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
