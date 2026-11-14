'use client';

import { Check, Info, X } from 'lucide-react';
import type { ToastItem } from '../context/ToastContext';
import { cx, focusRing } from './ui';

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

/**
 * Short messages after an action, bottom of the screen. Ink boxes like the
 * rest of the site; an error is told by its red rule and is announced
 * assertively, the others politely.
 */
export default function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[400] mx-auto flex max-w-sm flex-col gap-2 sm:left-auto sm:right-6 sm:mx-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={cx(
            'animate-rise-in pointer-events-auto flex items-start gap-3 border bg-ink py-2 pl-4 pr-1 text-paper',
            toast.type === 'error' ? 'border-accent-text border-l-4' : 'border-ink'
          )}
        >
          {toast.type === 'success' ? (
            <Check size={16} className="mt-2.5 shrink-0" aria-hidden />
          ) : toast.type === 'info' ? (
            <Info size={16} className="mt-2.5 shrink-0" aria-hidden />
          ) : (
            <X size={16} className="mt-2.5 shrink-0" aria-hidden />
          )}
          <p className="flex-grow py-2 font-sans text-sm leading-snug">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Tutup pemberitahuan"
            className={cx('flex h-11 w-11 shrink-0 items-center justify-center opacity-70 hover:opacity-100', focusRing)}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
