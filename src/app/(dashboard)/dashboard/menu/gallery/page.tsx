'use client';

import { useState } from 'react';
import { useAllGallery, useDeleteGalleryItem } from '@/hooks/useGallery';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/shared/Image';
import { Trash2 } from 'lucide-react';

export default function GalleryPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: galleryItems, isLoading, error, refetch } = useAllGallery();
  const deleteGalleryItem = useDeleteGalleryItem();

  const handleDelete = () => {
    if (deleteId) {
      deleteGalleryItem.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Gallery</h1>
          <p className="text-muted-foreground">Manage restaurant gallery images.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Image
        </Button>
      </div>

      {!galleryItems?.length ? (
        <EmptyState
          title="No images found"
          description="Add images to showcase your restaurant."
          action={{ label: 'Add Image', onClick: () => {} }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {galleryItems.map((item) => (
            <Card key={item.id} className="group relative overflow-hidden">
              <div className="aspect-square w-full overflow-hidden">
                <Image
                  src={item.image_url}
                  alt={item.caption_en || 'Gallery image'}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setDeleteId(item.id)}
                  aria-label={`Delete gallery image${item.caption_en ? `: ${item.caption_en}` : ''}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {(item.caption_en || !item.is_visible) && (
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  {item.caption_en && (
                    <p className="line-clamp-1 text-sm text-white">{item.caption_en}</p>
                  )}
                  {!item.is_visible && (
                    <Badge variant="secondary" className="text-xs">Hidden</Badge>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Image"
        description="Are you sure you want to delete this image? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteGalleryItem.isPending}
      />
    </div>
  );
}
