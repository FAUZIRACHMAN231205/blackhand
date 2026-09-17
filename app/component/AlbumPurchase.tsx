'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Lock, Loader2, ShieldCheck, Download } from 'lucide-react';
import { formatIdr } from '../lib/categories';
import { useToast } from '../context/ToastContext';
import AlbumDownloads from './AlbumDownloads';

/** Midtrans Snap injects this global once its script has loaded. */
interface SnapCallbacks {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
}
declare global {
  interface Window {
    snap?: { pay: (token: string, callbacks?: SnapCallbacks) => void };
  }
}

const CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? '';

// Sandbox client keys are prefixed `SB-`, production ones are not — so the
// right Snap host follows from the key itself and needs no second env var.
const SNAP_SRC = CLIENT_KEY.startsWith('SB-')
  ? 'https://app.sandbox.midtrans.com/snap/snap.js'
  : 'https://app.midtrans.com/snap/snap.js';

interface AlbumPurchaseProps {
  workId: string;
  imageCount: number;
  priceIdr: number | null;
  isForSale: boolean;
  owned: boolean;
  isLoggedIn: boolean;
  /** Called when the visitor needs to sign in before buying. */
  onRequireAuth: () => void;
  /** Called once payment is confirmed, so the page can unlock its images. */
  onUnlocked: () => void;
  /** The image on screen, offered as a single JPG download once owned. */
  currentImageId?: string;
  currentPosition?: number;
}

export default function AlbumPurchase({
  workId,
  imageCount,
  priceIdr,
  isForSale,
  owned,
  isLoggedIn,
  onRequireAuth,
  onUnlocked,
  currentImageId,
  currentPosition,
}: AlbumPurchaseProps) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  /**
   * The webhook, not the browser, decides when an order is paid — so after
   * checkout we re-ask the server until it agrees, rather than trusting the
   * Snap callback on its own.
   */
  const waitForEntitlement = useCallback(async () => {
    setConfirming(true);
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const res = await fetch(`/api/works/${workId}/album`);
        if (res.ok && (await res.json()).owned) {
          setConfirming(false);
          showToast({ type: 'success', message: 'Pembayaran berhasil. Album terbuka!' });
          onUnlocked();
          return;
        }
      } catch {
        // Ignore and retry — a transient failure shouldn't end the wait.
      }
      await new Promise((r) => {
        const t = setTimeout(r, 1500);
        timers.current.push(t);
      });
    }
    setConfirming(false);
    showToast({
      type: 'info',
      message: 'Pembayaran sedang diproses. Album akan terbuka otomatis setelah dikonfirmasi.',
    });
  }, [workId, showToast, onUnlocked]);

  const handleBuy = async () => {
    if (!isLoggedIn) {
      onRequireAuth();
      return;
    }
    if (busy) return;

    if (!window.snap) {
      showToast({ type: 'error', message: 'Pembayaran belum siap. Coba lagi sebentar lagi.' });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/works/${workId}/purchase`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        showToast({ type: 'error', message: data.error || 'Gagal memulai pembayaran.' });
        return;
      }

      window.snap.pay(data.token, {
        onSuccess: () => waitForEntitlement(),
        onPending: () => waitForEntitlement(),
        onError: () =>
          showToast({ type: 'error', message: 'Pembayaran gagal. Silakan coba lagi.' }),
        onClose: () => showToast({ type: 'info', message: 'Pembayaran dibatalkan.' }),
      });
    } catch (err) {
      console.error('Purchase error:', err);
      showToast({ type: 'error', message: 'Terjadi kesalahan. Silakan coba lagi.' });
    } finally {
      setBusy(false);
    }
  };

  // Ownership outranks sale status: an album taken off sale must stay
  // downloadable for everyone who already bought it.
  if (owned) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
          <ShieldCheck size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0">
            <p className="font-sans text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Album ini milik Anda
            </p>
            <p className="font-sans text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
              Semua {imageCount} gambar sudah terbuka.
            </p>
          </div>
        </div>
        <AlbumDownloads
          workId={workId}
          imageCount={imageCount}
          currentImageId={currentImageId}
          currentPosition={currentPosition}
        />
      </div>
    );
  }

  if (!isForSale || priceIdr == null) return null;

  return (
    <div className="space-y-3">
      {CLIENT_KEY && (
        <Script src={SNAP_SRC} data-client-key={CLIENT_KEY} strategy="afterInteractive" />
      )}

      <div className="rounded-xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
          Harga Album
        </p>
        <p className="mt-1 font-sans text-2xl font-black text-black dark:text-white">
          {formatIdr(priceIdr)}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 font-sans text-[11px] text-black/60 dark:text-white/60">
          <Download size={12} className="shrink-0" />
          {imageCount} gambar resolusi penuh, bisa diunduh selamanya.
        </p>
      </div>

      <button
        onClick={handleBuy}
        disabled={busy || confirming}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 font-sans text-[11px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy || confirming ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            {confirming ? 'Mengonfirmasi...' : 'Menyiapkan...'}
          </>
        ) : (
          <>
            <Lock size={14} />
            Beli Album
          </>
        )}
      </button>

      {!isLoggedIn && (
        <p className="text-center font-sans text-[11px] text-black/50 dark:text-white/50">
          Masuk dulu untuk membeli album ini.
        </p>
      )}
    </div>
  );
}
