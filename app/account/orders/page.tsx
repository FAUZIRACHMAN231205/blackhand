'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, X } from 'lucide-react';
import SnapScript, { openSnap } from '../../component/SnapScript';
import { Button, EmptyState, Tag, cx, focusRing, type TagVariant } from '../../component/ui';
import { useToast } from '../../context/ToastContext';
import { formatIdr } from '../../lib/categories';
import { formatClock } from '../../lib/sales';
import { ACCOUNT_ORDERS } from '../../lib/routes';
import { orderStageLabel, type FulfillmentStatus, type PaymentStatus } from '../../lib/shop';

interface ProductOrder {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  subtotal_idr: number;
  shipping_fee_idr: number;
  total_idr: number;
  status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  recipient_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  courier: string | null;
  tracking_number: string | null;
  created_at: string;
  cover_image_url: string | null;
  payment_deadline: string;
  can_resume: boolean;
}

/** Status by shape: dashed while waiting, solid once it can't go further, outline otherwise. */
function stageVariant(order: ProductOrder): TagVariant {
  if (order.status === 'pending') return 'dashed';
  if (order.status !== 'paid' || order.fulfillment_status === 'cancelled') return 'solid';
  return 'outline';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Shown once, right after checkout sends the buyer here. */
function PlacedBanner() {
  const params = useSearchParams();
  const router = useRouter();
  if (!params.get('placed')) return null;

  return (
    <div role="status" className="flex items-start gap-3 border border-ink px-4 py-3">
      <p className="flex-grow font-sans text-sm font-semibold">
        Terima kasih! Status pesanan diperbarui otomatis begitu pembayaran dikonfirmasi.
      </p>
      <button
        type="button"
        onClick={() => router.replace(ACCOUNT_ORDERS)}
        className={cx('-m-2 flex h-11 w-11 shrink-0 items-center justify-center text-mute hover:text-ink', focusRing)}
        aria-label="Tutup pemberitahuan"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}

/** Akun › Pesanan: merchandise orders, their status and tracking numbers. */
export default function OrdersTab() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [resuming, setResuming] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/me/product-orders');
      if (!res.ok) throw new Error(await res.text());
      const data: { orders: ProductOrder[] } = await res.json();
      setOrders(data.orders);
      setLoadError(false);
    } catch (err) {
      console.error('Error loading orders:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const resume = async (order: ProductOrder) => {
    if (resuming) return;
    setResuming(order.id);
    try {
      const res = await fetch(`/api/me/product-orders/${order.id}/pay`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        showToast({ type: 'error', message: data.error || 'Gagal membuka pembayaran.' });
        load();
        return;
      }
      const opened = openSnap(data.token, {
        onSuccess: () => load(),
        onPending: () => load(),
        onError: () => showToast({ type: 'error', message: 'Pembayaran gagal. Silakan coba lagi.' }),
        onClose: () => load(),
      });
      if (!opened) showToast({ type: 'error', message: 'Pembayaran belum siap. Coba lagi sebentar lagi.' });
    } catch (err) {
      console.error('Resume payment error:', err);
      showToast({ type: 'error', message: 'Terjadi kesalahan. Silakan coba lagi.' });
    } finally {
      setResuming(null);
    }
  };

  return (
    <div className="grid gap-6">
      <SnapScript />
      <Suspense fallback={null}>
        <PlacedBanner />
      </Suspense>

      {loading ? (
        <div className="grid gap-4" aria-busy="true" aria-label="Memuat pesanan">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-20 w-20 animate-pulse bg-sheet" />
              <div className="h-20 flex-grow animate-pulse bg-sheet" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <p role="alert" className="py-10 font-sans text-sm text-accent-text">
          Gagal memuat pesanan. Muat ulang halaman untuk mencoba lagi.
        </p>
      ) : orders.length === 0 ? (
        <EmptyState
          title="Belum ada pesanan"
          description="Pesanan merchandise Anda akan muncul di sini beserta nomor resinya."
          action={
            <Button variant="secondary" href="/shop">
              Lihat toko
            </Button>
          }
        />
      ) : (
        <ul className="border-t border-line">
          {orders.map((order) => (
            <li key={order.id} className="grid gap-4 border-b border-line py-5">
              <div className="flex gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden bg-sheet">
                  {order.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={order.cover_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-mute">
                      <ShoppingBag size={22} strokeWidth={1.25} aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-grow grid content-start gap-1.5">
                  <Tag variant={stageVariant(order)} className="w-fit">
                    {orderStageLabel(order.status, order.fulfillment_status)}
                  </Tag>
                  <h2 className="font-serif text-lg italic leading-tight">
                    {order.product_id ? (
                      <Link href={`/shop/${order.product_id}`} className={cx('hover:underline', focusRing)}>
                        {order.product_name}
                      </Link>
                    ) : (
                      order.product_name
                    )}
                  </h2>
                  <p className="font-sans text-xs text-mute">
                    {order.quantity} barang · {formatIdr(order.total_idr)} · {formatDate(order.created_at)}
                  </p>
                  {order.tracking_number && (
                    <p className="font-sans text-xs">
                      <span className="text-mute">Resi {order.courier}: </span>
                      <span className="select-all break-all font-mono font-bold">{order.tracking_number}</span>
                    </p>
                  )}
                  {order.status === 'needs_refund' && (
                    <p className="font-sans text-xs text-accent-text">
                      Stok habis sebelum pembayaran Anda diterima. Admin akan mengembalikan dana Anda.
                    </p>
                  )}
                  <p className="line-clamp-2 font-sans text-[11px] text-mute">
                    Kirim ke {order.recipient_name}, {order.shipping_address}, {order.shipping_city}{' '}
                    {order.shipping_postal_code}
                  </p>
                </div>
              </div>
              {order.can_resume && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-sans text-xs text-ink">
                    Selesaikan pembayaran sebelum pukul {formatClock(order.payment_deadline)} WIB.
                  </p>
                  <Button
                    variant="buy"
                    onClick={() => resume(order)}
                    loading={resuming === order.id}
                    disabled={resuming !== null}
                  >
                    Bayar sekarang
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
