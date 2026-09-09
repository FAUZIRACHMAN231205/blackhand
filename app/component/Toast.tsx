'use client';

import { CheckCircle2, XCircle, X } from 'lucide-react';
import type { ToastItem } from '../context/ToastContext';

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export default function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-3 w-[calc(100%-3rem)] max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-fade-in-up flex items-start gap-3 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl px-4 py-3.5 backdrop-blur-md"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} strokeWidth={1.5} className="text-violet-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle size={18} strokeWidth={1.5} className="text-rose-400 shrink-0 mt-0.5" />
          )}
          <p className="flex-grow font-sans text-xs text-white/90 leading-relaxed pt-0.5">
            {toast.message}
          </p>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-zinc-500 hover:text-white transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
