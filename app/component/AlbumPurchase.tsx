'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatClock, PAYMENT_WINDOW_MINUTES, type WorkSaleState } from '../lib/sales';
import { useToast } from '../context/ToastContext';
import AlbumDownloads from './AlbumDownloads';
import SnapScript, { openSnap } from './SnapScript';
import { Button, Notice, Price } from './ui';

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

  // Unknown until the server answers (or if it can't): show nothing rather
  // than a buy button that might be wrong.
  if (!sale) return null;

  if (sale.status === 'owned') {
    return (
      <div className="grid gap-4">
        <Notice title="Milik Anda">
          Anda satu-satunya pemilik karya ini. Unduh {imageCount} file resolusi penuh kapan saja.
        </Notice>
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
      <Notice title="Terjual">
        Karya ini sudah dimiliki seorang kolektor. Anda tetap bisa menikmatinya di sini, tetapi karya ini tidak lagi
        bisa dibeli atau diunduh.
      </Notice>
    );
  }

  if (sale.status === 'not_for_sale' || priceIdr == null) {
    return <Notice title="Hanya dipamerkan">Karya ini tidak dijual.</Notice>;
  }

  const priceBlock = (
    <dl className="grid gap-2 font-sans text-sm">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-[11px] font-bold uppercase tracking-[0.2em] text-mute">Harga</dt>
        <dd>
          <Price amount={priceIdr} size="lg" />
        </dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-line pt-2">
        <dt className="text-mute">Eksklusif</dt>
        <dd className="text-right">1 pembeli saja</dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-line pt-2">
        <dt className="text-mute">File</dt>
        <dd className="text-right">{imageCount} resolusi penuh · JPG, ZIP, PDF, Drive</dd>
      </div>
    </dl>
  );

  if (sale.status === 'reserved') {
    return (
      <div className="grid gap-4">
        {priceBlock}
        <Notice tone="pending" title="Sedang dibeli">
          Pengunjung lain sedang membayar karya ini
          {sale.reservedUntil ? ` sampai pukul ${formatClock(sale.reservedUntil)} WIB` : ''}. Kalau pembayarannya tidak
          selesai, karya ini tersedia lagi.
        </Notice>
      </div>
    );
  }

  const resuming = sale.status === 'reserved_by_you';

  return (
    <div className="grid gap-4">
      <SnapScript />
      {priceBlock}

      {resuming && (
        <Notice tone="pending" title="Disimpan untuk Anda">
          Selesaikan pembayaran
          {sale.reservedUntil ? ` sebelum pukul ${formatClock(sale.reservedUntil)} WIB` : ''}, setelah itu karya ini
          dibuka lagi untuk pembeli lain.
        </Notice>
      )}

      <Button variant="buy" fullWidth onClick={handleBuy} loading={busy || confirming}>
        {confirming
          ? 'Mengonfirmasi pembayaran'
          : busy
            ? 'Menyiapkan pembayaran'
            : resuming
              ? 'Lanjutkan pembayaran'
              : 'Beli karya ini'}
      </Button>

      {!isLoggedIn && <p className="text-center font-sans text-xs text-mute">Masuk dulu untuk membeli karya ini.</p>}
    </div>
  );
}
