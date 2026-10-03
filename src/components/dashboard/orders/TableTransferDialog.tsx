'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFreeTablesForTransfer } from '@/hooks/useTableTransfer';

interface TableTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTableNumber?: string | null;
  title: string;
  description: string;
  tableLabel: string;
  tablePlaceholder: string;
  confirmLabel: string;
  cancelLabel: string;
  loading: boolean;
  onConfirm: (tableNumber: string) => void;
}

export function TableTransferDialog({
  open,
  onOpenChange,
  currentTableNumber,
  title,
  description,
  tableLabel,
  tablePlaceholder,
  confirmLabel,
  cancelLabel,
  loading,
  onConfirm,
}: TableTransferDialogProps) {
  const [selected, setSelected] = useState('');
  const { freeTables, isLoading } = useFreeTablesForTransfer(currentTableNumber);

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelected('');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="transfer-table">{tableLabel}</Label>
          <Select
            value={selected}
            onValueChange={(value) => setSelected(value ?? '')}
            disabled={isLoading || loading}
          >
            <SelectTrigger id="transfer-table" className="min-h-11">
              <SelectValue placeholder={tablePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {freeTables.map((table) => (
                <SelectItem key={table.id} value={String(table.table_number)}>
                  {String(table.table_number)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => handleOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={loading || !selected}
            onClick={() => onConfirm(selected)}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
