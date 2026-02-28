'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DuplicateMatch } from '@/hooks/use-check-duplicates';

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: DuplicateMatch[];
  onCreateAnyway: () => void;
}

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  matches,
  onCreateAnyway,
}: DuplicateWarningDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Potential Duplicate Detected</DialogTitle>
          <DialogDescription>
            We found {matches.length} existing account{matches.length !== 1 ? 's' : ''} with a
            similar name. Please review before creating a new account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {matches.map((match) => (
            <div
              key={match.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="space-y-1">
                <p className="font-medium">{match.name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{match.territory.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {match.confidence}% match
                  </Badge>
                </div>
              </div>
              <Link href={`/accounts/${match.id}`}>
                <Button variant="outline" size="sm">
                  View Existing
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreateAnyway}>Create Anyway</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
