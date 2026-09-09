'use client';

import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onCancel} />

      <div className="relative w-full max-w-[380px] bg-zinc-950 border border-white/10 p-8 rounded-2xl shadow-2xl animate-fade-in-up">
        <div className="flex items-start gap-4 mb-6">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              danger ? 'bg-rose-500/10 text-rose-400' : 'bg-violet-500/10 text-violet-400'
            }`}
          >
            <AlertTriangle size={18} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-serif text-2xl italic text-white mb-1.5">{title}</h3>
            <p className="font-sans text-xs text-zinc-400 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-zinc-900 border border-white/10 text-white font-sans text-[11px] font-black uppercase tracking-[0.2em] py-3.5 rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 font-sans text-[11px] font-black uppercase tracking-[0.2em] py-3.5 rounded-xl transition-all disabled:opacity-50 ${
              danger
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'bg-white text-black hover:bg-zinc-200'
            }`}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
