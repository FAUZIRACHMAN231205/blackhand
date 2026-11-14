'use client';

import { useEffect, useId, useRef } from 'react';
import { Button } from './ui';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive (delete): the confirm button is the dashed danger one. */
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The confirmation step every delete goes through (docs/DESIGN.md). Cancel
 * gets the focus, so Enter never destroys anything by accident; Escape and a
 * click outside also cancel.
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current?.querySelector('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-ink/60" onClick={loading ? undefined : onCancel} aria-hidden />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="relative grid w-full max-w-sm gap-6 border border-ink bg-paper p-6 text-ink"
      >
        <div className="grid gap-2">
          <h2 id={titleId} className="font-sans text-xl font-bold uppercase tracking-[-0.01em]">
            {title}
          </h2>
          <p id={messageId} className="font-sans text-sm leading-relaxed text-mute">
            {message}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div ref={cancelRef} className="grid">
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
          </div>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
