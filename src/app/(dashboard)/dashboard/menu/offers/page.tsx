'use client';

import { useState } from 'react';
import { useAllOffers, useDeleteOffer, useToggleOfferActive } from '@/hooks/useOffers';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/shared/Image';
import { Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { format } from 'date-fns';

export default function OffersPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: offers, isLoading, error, refetch } = useAllOffers();
  const deleteOffer = useDeleteOffer();
  const toggleOffer = useToggleOfferActive();

  const handleDelete = () => {
    if (deleteId) {
      deleteOffer.mutate(deleteId, {
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
          <h1 className="text-2xl font-bold md:text-3xl">Offers</h1>
          <p className="text-muted-foreground">Manage promotional offers and discounts.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Offer
        </Button>
      </div>

      {!offers?.length ? (
        <EmptyState
          title="No offers found"
          description="Create promotional offers to attract customers."
          action={{ label: 'Add Offer', onClick: () => {} }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <Card key={offer.id} className="overflow-hidden">
              {offer.image_url && (
                <div className="aspect-video w-full overflow-hidden">
                  <Image
                    src={offer.image_url}
                    alt={offer.title_en}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{offer.title_en}</CardTitle>
                    <p className="text-sm text-muted-foreground" dir="rtl">
                      {offer.title_ar}
                    </p>
                  </div>
                  <Badge variant={offer.is_active ? 'default' : 'secondary'}>
                    {offer.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {offer.description_en && (
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                    {offer.description_en}
                  </p>
                )}
                <div className="mb-4 flex items-center gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Discount</p>
                    <p className="font-semibold text-primary">
                      {offer.discount_type === 'percentage'
                        ? `${offer.discount_value}%`
                        : `${offer.discount_value} SAR`}
                    </p>
                  </div>
                  {offer.start_date && (
                    <div>
                      <p className="text-xs text-muted-foreground">Valid from</p>
                      <p className="text-sm">{format(new Date(offer.start_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  {offer.end_date && (
                    <div>
                      <p className="text-xs text-muted-foreground">Valid until</p>
                      <p className="text-sm">{format(new Date(offer.end_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      toggleOffer.mutate({ id: offer.id, is_active: !offer.is_active })
                    }
                    aria-label={offer.is_active ? `Deactivate ${offer.title_en}` : `Activate ${offer.title_en}`}
                  >
                    {offer.is_active ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${offer.title_en}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteId(offer.id)}
                    aria-label={`Delete ${offer.title_en}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Offer"
        description="Are you sure you want to delete this offer? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteOffer.isPending}
      />
    </div>
  );
}
