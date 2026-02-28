import { useState, useCallback } from 'react';

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

export interface UseConfirmDialogReturn {
  isOpen: boolean;
  options: ConfirmDialogOptions | null;
  open: (options: ConfirmDialogOptions) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function useConfirmDialog(): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<{ resolve: (confirmed: boolean) => void } | null>(null);

  const open = useCallback((opts: ConfirmDialogOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveRef({ resolve });
    });
  }, []);

  const onConfirm = useCallback(() => {
    setIsOpen(false);
    resolveRef?.resolve(true);
    setResolveRef(null);
  }, [resolveRef]);

  const onCancel = useCallback(() => {
    setIsOpen(false);
    resolveRef?.resolve(false);
    setResolveRef(null);
  }, [resolveRef]);

  return { isOpen, options, open, onConfirm, onCancel };
}
