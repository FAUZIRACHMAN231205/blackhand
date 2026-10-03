'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Loader2, Package, ShoppingBag, CheckCircle2, X } from 'lucide-react';
import Navbar from '../component/Navbar';
import SnapScript, { openSnap } from '../component/SnapScript';
import { LoadingSpinner } from '../component/LoadingStates';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { formatIdr } from '../lib/categories';
import { formatClock } from '../lib/sales';
import { orderStageLabel, type FulfillmentStatus, type PaymentStatus } from '../lib/shop';

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

function stageTone(order: ProductOrder): string {
  if (order.status === 'pending') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
  if (order.status !== 'paid') return 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
  if (order.fulfillment_status === 'cancelled') return 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
  if (order.fulfillment_status === 'completed') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  return 'bg-violet-500/10 text-violet-700 dark:text-violet-300';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Shown once, right after checkout redirects here. */
function PlacedBanner() {
  const params = useSearchParams();
  const router = useRouter();
  if (!params.get('placed')) return null;

  return (
    <div
      role="status"
      className="mb-8 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3.5 text-emerald-800 dark:text-emerald-300"
    >
      <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      <p className="flex-grow font-sans text-sm font-semibold">
        Terima kasih! Status pesanan diperbarui otomatis begitu pembayaran dikonfirmasi.
      </p>
      <button
        type="button"
        onClick={() => router.replace('/orders')}
        className="-m-1.5 shrink-0 p-2.5 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Tutup pemberitahuan"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function MyOrders() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [resuming, setResuming] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

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
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [user, load]);

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

  if (loading) return <LoadingSpinner />;
  if (!user) return null;

  return (
    <>
      <Navbar onOpenModal={() => {}} />
      <SnapScript />

      <main className="min-h-[100dvh] bg-white px-4 pb-16 pt-24 text-black transition-colors duration-300 dark:bg-slate-950 dark:text-white md:px-6">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/shop"
            className="group mb-6 flex w-fit items-center gap-2 py-2 text-black/60 transition-colors hover:text-black dark:text-white/60 dark:hover:text-white"
          >
            <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1" />
            <span className="font-sans text-sm font-medium">Kembali ke Shop</span>
          </Link>

          <header className="mb-10">
            <h1 className="mb-2 font-serif text-4xl font-medium italic sm:text-5xl">Pesanan Saya</h1>
            <p className="font-sans text-sm text-black/60 dark:text-white/60">
              Pesanan merchandise Anda dan status pengirimannya.
            </p>
          </header>

          <Suspense fallback={null}>
            <PlacedBanner />
          </Suspense>

          {loadingOrders ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin opacity-50" />
            </div>
          ) : loadError ? (
            <p className="py-16 text-center font-sans text-sm text-rose-600 dark:text-rose-400">
              Gagal memuat pesanan. Muat ulang halaman untuk mencoba lagi.
            </p>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 p-12 text-center dark:border-white/15">
              <Package size={32} strokeWidth={1.25} className="mx-auto mb-4 opacity-50" />
              <h2 className="mb-2 font-serif text-2xl italic">Belum ada pesanan</h2>
              <p className="mb-6 font-sans text-sm text-black/60 dark:text-white/60">
                Pesanan merchandise Anda akan muncul di sini.
              </p>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-xl bg-black px-6 py-3 font-sans text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:opacity-90 dark:bg-white dark:text-black"
              >
                Lihat Shop
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950/60 sm:p-5"
                >
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
                      {order.cover_image_url ? (
                        <img src={order.cover_image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag size={22} strokeWidth={1.25} className="opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-grow">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="font-serif text-lg italic leading-tight">
                          {order.product_id ? (
                            <Link href={`/shop/${order.product_id}`} className="hover:text-violet-600 dark:hover:text-violet-400">
                              {order.product_name}
                            </Link>
                          ) : (
                            order.product_name
                          )}
                        </h2>
                        <span className={`rounded-full px-2.5 py-1 font-sans text-[10px] font-bold ${stageTone(order)}`}>
                          {orderStageLabel(order.status, order.fulfillment_status)}
                        </span>
                      </div>
                      <p className="mt-1 font-sans text-xs text-black/55 dark:text-white/55">
                        {order.quantity} barang · {formatIdr(order.total_idr)} · {formatDate(order.created_at)}
                      </p>
                      {order.tracking_number && (
                        <p className="mt-1.5 font-sans text-xs">
                          <span className="text-black/55 dark:text-white/55">Resi {order.courier}: </span>
                          <span className="select-all break-all font-mono font-bold">{order.tracking_number}</span>
                        </p>
                      )}
                      {order.status === 'needs_refund' && (
                        <p className="mt-1.5 font-sans text-xs text-rose-700 dark:text-rose-300">
                          Stok habis sebelum pembayaran Anda diterima. Dana Anda akan dikembalikan oleh admin.
                        </p>
                      )}
                      <p className="mt-1.5 line-clamp-2 font-sans text-[11px] text-black/45 dark:text-white/45">
                        Kirim ke {order.recipient_name}, {order.shipping_address}, {order.shipping_city}{' '}
                        {order.shipping_postal_code}
                      </p>
                    </div>
                  </div>
                  {order.can_resume && (
                    <div className="mt-4 flex flex-col gap-2 border-t border-black/5 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-sans text-[11px] text-amber-700 dark:text-amber-300">
                        Selesaikan pembayaran sebelum pukul {formatClock(order.payment_deadline)} WIB.
                      </p>
                      <button
                        onClick={() => resume(order)}
                        disabled={resuming !== null}
                        className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 font-sans text-[11px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
                      >
                        {resuming === order.id && <Loader2 size={14} className="animate-spin" />}
                        Lanjutkan Pembayaran
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
