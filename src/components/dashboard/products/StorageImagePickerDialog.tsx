'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image } from '@/components/shared/Image';
import { useStorageImages } from '@/hooks/useStorageImages';
import { cn } from '@/lib/utils';

interface StorageImagePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  selectedUrl?: string | null;
  title: string;
  emptyLabel: string;
  loadMoreLabel: string;
  loadingLabel: string;
  selectLabel: string;
  cancelLabel: string;
}

export function StorageImagePickerDialog({
  open,
  onOpenChange,
  onSelect,
  selectedUrl,
  title,
  emptyLabel,
  loadMoreLabel,
  loadingLabel,
  selectLabel,
  cancelLabel,
}: StorageImagePickerDialogProps) {
  const [pendingUrl, setPendingUrl] = useState<string | null>(selectedUrl ?? null);
  const activeSelection = pendingUrl ?? selectedUrl ?? null;
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useStorageImages('products', open);

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  const handleConfirm = () => {
    if (!activeSelection) return;
    onSelect(activeSelection);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-full sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{loadingLabel}</span>
          </div>
        ) : error ? (
          <p className="text-destructive py-8 text-center text-sm">{error.message}</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{emptyLabel}</p>
        ) : (
          <ScrollArea className="max-h-[min(60vh,520px)] pr-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items.map((item) => {
                const isSelected = activeSelection === item.url;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setPendingUrl(item.url)}
                    className={cn(
                      'border-border/60 bg-muted/20 relative aspect-square overflow-hidden rounded-md border transition-colors',
                      isSelected && 'ring-brand-accent ring-2 ring-offset-2'
                    )}
                    aria-label={item.name}
                    aria-pressed={isSelected}
                  >
                    <Image
                      src={item.url}
                      alt={item.name}
                      fill
                      sizes="120px"
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
          </ScrollArea>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          {hasNextPage && !isLoading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {loadingLabel}
                </>
              ) : (
                loadMoreLabel
              )}
            </Button>
          )}
          <div className="ms-auto flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button type="button" disabled={!activeSelection} onClick={handleConfirm}>
              {selectLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
