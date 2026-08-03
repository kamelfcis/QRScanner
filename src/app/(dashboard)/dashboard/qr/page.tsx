'use client';

import { useState } from 'react';
import { useQRCodes, useCreateQRCode, useUpdateQRCode, useDeleteQRCode, useDuplicateQRCode } from '@/hooks/useQRCodes';
import { useRestaurantTables } from '@/hooks/useRestaurantTables';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCard } from '@/components/qr/QRCard';
import { QRForm } from '@/components/qr/QRForm';
import type { QrCodeWithTable } from '@/types';
import type { QrCodeInput } from '@/types/schema';
import { Plus, QrCode, Search } from 'lucide-react';

export default function QRManagementPage() {
  const { data: qrCodes, isLoading, error, refetch } = useQRCodes();
  const { data: tables = [] } = useRestaurantTables();
  const createMutation = useCreateQRCode();
  const updateMutation = useUpdateQRCode();
  const deleteMutation = useDeleteQRCode();
  const duplicateMutation = useDuplicateQRCode();

  const [showForm, setShowForm] = useState(false);
  const [editingQR, setEditingQR] = useState<QrCodeWithTable | null>(null);
  const [deletingQR, setDeletingQR] = useState<QrCodeWithTable | null>(null);
  const [search, setSearch] = useState('');

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  const filtered = qrCodes?.filter(
    (qr) =>
      qr.name.toLowerCase().includes(search.toLowerCase()) ||
      qr.url.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: QrCodeInput) => {
    await createMutation.mutateAsync(data);
    setShowForm(false);
  };

  const handleUpdate = async (data: QrCodeInput) => {
    if (!editingQR) return;
    await updateMutation.mutateAsync({ id: editingQR.id, input: data });
    setEditingQR(null);
  };

  const handleDelete = async () => {
    if (!deletingQR) return;
    await deleteMutation.mutateAsync(deletingQR.id);
    setDeletingQR(null);
  };

  const handleDuplicate = async (qr: QrCodeWithTable) => {
    await duplicateMutation.mutateAsync(qr);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">QR Codes</h1>
          <p className="text-muted-foreground">Create and manage QR codes for your restaurant</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create QR Code
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search QR codes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {!filtered?.length ? (
        <EmptyState
          icon={<QrCode className="h-12 w-12 text-muted-foreground/50" />}
          title={search ? 'No QR codes found' : 'No QR codes yet'}
          description={search ? 'Try a different search term' : 'Create your first QR code to get started'}
          action={!search ? { label: 'Create QR Code', onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((qr) => (
            <QRCard
              key={qr.id}
              qr={qr}
              onEdit={setEditingQR}
              onDelete={setDeletingQR}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create QR Code</DialogTitle>
          </DialogHeader>
          <QRForm
            tables={tables}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingQR} onOpenChange={() => setEditingQR(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit QR Code</DialogTitle>
          </DialogHeader>
          {editingQR && (
            <QRForm
              initialData={editingQR}
              tables={tables}
              onSubmit={handleUpdate}
              onCancel={() => setEditingQR(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingQR}
        onOpenChange={() => setDeletingQR(null)}
        title="Delete QR Code"
        description={`Are you sure you want to delete "${deletingQR?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
