'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck, Download, Gem, Clock, BadgeCheck } from 'lucide-react';
import { formatIdr } from '../lib/categories';
import { formatClock, PAYMENT_WINDOW_MINUTES, type WorkSaleState } from '../lib/sales';
import { useToast } from '../context/ToastContext';
import AlbumDownloads from './AlbumDownloads';
import SnapScript, { openSnap } from './SnapScript';

interface AlbumPurchaseProps {
  workId: string;
  imageCount: number;
  priceIdr: number | null;
  /** Null while it is still loading. */
  sale: WorkSaleState | null;
  isLoggedIn: boolean;
  /** Called when the visitor needs to sign in before buying. */
  onRequireAuth: () => void;
  /** Called whenever the sale state may have changed, so the page re-asks. */
  onChanged: () => void;
  /** The image on screen, offered as a single JPG download once owned. */
  currentImageId?: string;
  currentPosition?: number;
}

const cardLabel =
  'font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-black/50 dark:text-white/50';

/**
 * Buying a work. Each work has exactly one buyer: once it is paid for it shows
 * as sold to everyone else, and only its owner gets the downloads.
 */
export default function AlbumPurchase({
  workId,
  imageCount,
  priceIdr,
  sale,
  isLoggedIn,
  onRequireAuth,
  onChanged,
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
  const waitForOwnership = useCallback(async () => {
    setConfirming(true);
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const res = await fetch(`/api/works/${workId}/album`);
        if (res.ok) {
          const data: { owned: boolean; sale: WorkSaleState } = await res.json();
          if (data.owned) {
            setConfirming(false);
            showToast({ type: 'success', message: 'Pembayaran berhasil. Karya ini kini milik Anda!' });
            onChanged();
            return;
          }
          if (data.sale.status === 'sold') {
            // Someone else's payment landed first; ours will be refunded.
            setConfirming(false);
            showToast({
              type: 'error',
              message: 'Karya ini sudah terjual ke pembeli lain. Pembayaran Anda akan dikembalikan.',
            });
            onChanged();
            return;
          }
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
      message: 'Pembayaran sedang diproses. Karya akan terbuka otomatis setelah dikonfirmasi.',
    });
    onChanged();
  }, [workId, showToast, onChanged]);

  const handleBuy = async () => {
    if (!isLoggedIn) {
      onRequireAuth();
      return;
    }
    if (busy) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/works/${workId}/purchase`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        showToast({ type: 'error', message: data.error || 'Gagal memulai pembayaran.' });
        // A 409 means sold or reserved meanwhile — show the page as it now is.
        if (res.status === 409) onChanged();
        return;
      }

      const opened = openSnap(data.token, {
        onSuccess: () => waitForOwnership(),
        onPending: () => waitForOwnership(),
        onError: () => showToast({ type: 'error', message: 'Pembayaran gagal. Silakan coba lagi.' }),
        onClose: () => {
          showToast({
            type: 'info',
            message: `Pembayaran belum selesai. Karya ini tetap disimpan untuk Anda selama ${PAYMENT_WINDOW_MINUTES} menit.`,
          });
          onChanged();
        },
      });
      if (!opened) {
        showToast({ type: 'error', message: 'Pembayaran belum siap. Coba lagi sebentar lagi.' });
        onChanged();
      }
    } catch (err) {
      console.error('Purchase error:', err);
      showToast({ type: 'error', message: 'Terjadi kesalahan. Silakan coba lagi.' });
    } finally {
      setBusy(false);
    }
  };

  if (!sale) return null;

  if (sale.status === 'owned') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
          <ShieldCheck size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0">
            <p className="font-sans text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Karya ini milik Anda
            </p>
            <p className="font-sans text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
              Anda satu-satunya pemilik. Unduh {imageCount} file resolusi penuh kapan saja.
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

  if (sale.status === 'sold') {
    return (
      <div className="rounded-xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="flex items-center gap-1.5 font-sans text-xs font-black uppercase tracking-[0.2em] text-black dark:text-white">
          <BadgeCheck size={15} className="text-violet-600 dark:text-violet-400" />
          Terjual
        </p>
        <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-black/60 dark:text-white/60">
          Karya ini sudah dimiliki seorang kolektor. Anda tetap bisa menikmatinya di sini, tetapi
          karya ini tidak lagi tersedia untuk dibeli maupun diunduh.
        </p>
      </div>
    );
  }

  if (sale.status === 'not_for_sale' || priceIdr == null) return null;

  if (sale.status === 'reserved') {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <p className={cardLabel}>Harga Karya</p>
        <p className="mt-1 font-sans text-2xl font-black text-black dark:text-white">{formatIdr(priceIdr)}</p>
        <p className="mt-2 flex items-start gap-1.5 font-sans text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
          <Clock size={13} className="mt-0.5 shrink-0" />
          <span>
            Sedang dalam proses pembelian oleh pengunjung lain
            {sale.reservedUntil ? ` hingga pukul ${formatClock(sale.reservedUntil)} WIB` : ''}. Jika
            pembayarannya tidak selesai, karya ini akan tersedia kembali.
          </span>
        </p>
      </div>
    );
  }

  const resuming = sale.status === 'reserved_by_you';

  return (
    <div className="space-y-3">
      <SnapScript />

      <div className="rounded-xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <p className={cardLabel}>Harga Karya</p>
        <p className="mt-1 font-sans text-2xl font-black text-black dark:text-white">{formatIdr(priceIdr)}</p>
        <p className="mt-2 flex items-start gap-1.5 font-sans text-[11px] leading-snug text-violet-700 dark:text-violet-300">
          <Gem size={12} className="mt-0.5 shrink-0" />
          Eksklusif — hanya untuk satu pembeli. Setelah terjual, karya ini tidak lagi bisa dibeli atau
          diunduh orang lain.
        </p>
        <p className="mt-1.5 flex items-start gap-1.5 font-sans text-[11px] leading-snug text-black/60 dark:text-white/60">
          <Download size={12} className="mt-0.5 shrink-0" />
          {imageCount} file resolusi penuh: JPG, ZIP, PDF, atau simpan ke Google Drive.
        </p>
      </div>

      {resuming && (
        <p className="flex items-start gap-1.5 rounded-lg bg-violet-500/10 px-3 py-2 font-sans text-[11px] leading-snug text-violet-800 dark:text-violet-300">
          <Clock size={12} className="mt-0.5 shrink-0" />
          Karya ini sedang disimpan untuk Anda
          {sale.reservedUntil ? ` hingga pukul ${formatClock(sale.reservedUntil)} WIB` : ''}. Selesaikan
          pembayaran sebelum waktunya habis.
        </p>
      )}

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
        ) : resuming ? (
          'Lanjutkan Pembayaran'
        ) : (
          'Beli Karya Ini'
        )}
      </button>

      {!isLoggedIn && (
        <p className="text-center font-sans text-[11px] text-black/50 dark:text-white/50">
          Masuk dulu untuk membeli karya ini.
        </p>
      )}
    </div>
  );
}
