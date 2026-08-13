'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { isDeletableCustomerStatus, isDeleteBlockedStatus } from '@/lib/engaz/status';

type DeleteCustomerDialogProps = {
  displayName: string;
  status: string;
  loading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
};

export function DeleteCustomerDialog({
  displayName,
  status,
  loading = false,
  open,
  onOpenChange,
  onConfirm,
}: DeleteCustomerDialogProps) {
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    setConfirming(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {displayName}?</DialogTitle>
          <DialogDescription>
            This permanently removes the customer record, admin credentials, and provision job
            history from Engaz Admin. When present, the Vercel project and git branch will also be
            removed. The customer&apos;s Supabase project is not deleted automatically — remove it
            manually in the Supabase dashboard if needed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={loading || confirming}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading || confirming || !isDeletableCustomerStatus(status)}
            onClick={() => void handleConfirm()}
          >
            {confirming ? 'Deleting…' : 'Yes, delete permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DeleteCustomerButtonProps = {
  displayName: string;
  status: string;
  loading?: boolean;
  size?: 'sm' | 'default';
  onConfirm: () => void | Promise<void>;
};

export function DeleteCustomerButton({
  displayName,
  status,
  loading = false,
  size = 'sm',
  onConfirm,
}: DeleteCustomerButtonProps) {
  const [open, setOpen] = useState(false);
  const canDelete = isDeletableCustomerStatus(status);
  const blocked = isDeleteBlockedStatus(status);

  const button = (
    <Button
      type="button"
      variant="destructive"
      size={size}
      disabled={!canDelete || loading}
      onClick={() => canDelete && setOpen(true)}
    >
      Delete
    </Button>
  );

  return (
    <>
      {blocked ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={button} />
            <TooltipContent>Set offline first</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}
      <DeleteCustomerDialog
        displayName={displayName}
        status={status}
        loading={loading}
        open={open}
        onOpenChange={setOpen}
        onConfirm={onConfirm}
      />
    </>
  );
}
