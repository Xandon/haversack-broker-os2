'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface CloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: 'closed_won' | 'closed_lost';
  opportunityName: string;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function CloseDialog({
  open,
  onOpenChange,
  stage,
  opportunityName,
  onConfirm,
  isLoading = false,
}: CloseDialogProps): React.ReactElement {
  const [reason, setReason] = React.useState('');

  const isWon = stage === 'closed_won';
  const title = isWon ? 'Mark as Won' : 'Mark as Lost';
  const description = isWon
    ? `Confirm that "${opportunityName}" has been won.`
    : `Confirm that "${opportunityName}" has been lost.`;
  const reasonLabel = isWon ? 'Win reason' : 'Loss reason';

  function handleConfirm(): void {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason('');
    }
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      setReason('');
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="close-reason">{reasonLabel}</Label>
          <Textarea
            id="close-reason"
            placeholder={`Enter ${isWon ? 'win' : 'loss'} reason...`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
            variant={isWon ? 'default' : 'destructive'}
          >
            {isLoading ? 'Saving...' : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
