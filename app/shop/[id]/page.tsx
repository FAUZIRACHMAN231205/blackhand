'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Loader2, Minus, Plus, ShoppingBag, Truck } from 'lucide-react';
import Navbar from '../../component/Navbar';
import AuthModal from '../../component/AuthModal';
import { LoadingSpinner } from '../../component/LoadingStates';
import SnapScript, { openSnap } from '../../component/SnapScript';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { formatIdr } from '../../lib/categories';
import { PAYMENT_WINDOW_MINUTES } from '../../lib/sales';
import {
  EMPTY_SHIPPING,
  MAX_ORDER_QUANTITY,
  parseShippingDetails,
  type ShippingDetails,
} from '../../lib/shop';
import type { Product, ProductImage } from '../../types';

const inputClass =
  'w-full rounded-xl border border-black/10 bg-white px-4 py-3 font-sans text-base text-black placeholder-black/40 transition-all focus:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/40 sm:text-sm';
const labelClass =
  'mb-1.5 block font-sans text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [shippingFee, setShippingFee] = useState(0);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [current, setCurrent] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [checkingOut, setCheckingOut] = useState(false);
  const [shipping, setShipping] = useState<ShippingDetails>(EMPTY_SHIPPING);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`/api/shop/products/${id}`);
        if (!res.ok) return;
        const data: { product: Product; images: ProductImage[]; shippingFeeIdr: number } = await res.json();
        if (ignore) return;
        setProduct(data.product);
        setImages(data.images);
        setShippingFee(data.shippingFeeIdr);
      } catch (err) {
        console.error('Error loading product:', err);
      } finally {
        if (!ignore) setLoadingProduct(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading || loadingProduct) return <LoadingSpinner />;

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <p className="mb-4 font-sans text-sm text-black/60 dark:text-white/60">Produk tidak ditemukan</p>
          <Link
            href="/shop"
            className="rounded-xl bg-black px-6 py-3 font-sans text-[11px] font-black uppercase tracking-[0.2em] text-white dark:bg-white dark:text-black"
          >
            Kembali ke Shop
          </Link>
        </div>
      </div>
    );
  }

  const soldOut = product.stock <= 0;
  const maxQuantity = Math.max(1, Math.min(MAX_ORDER_QUANTITY, product.stock));
  const subtotal = product.price_idr * quantity;
  const photo = images[current]?.image_url ?? product.cover_image_url;

  const startCheckout = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setShipping((prev) => ({ ...prev, recipient_name: prev.recipient_name || user.full_name || '' }));
    setCheckingOut(true);
  };

  const field = (key: keyof ShippingDetails) => ({
    value: shipping[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setShipping((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Same rules the server applies, so most mistakes show before a round trip.
    const parsed = parseShippingDetails({ ...shipping });
    if (!parsed.ok) {
      setFormError(parsed.error);
      return;
    }
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/shop/products/${product.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, ...parsed.value }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Gagal membuat pesanan.');
        return;
      }

      const opened = openSnap(data.token, {
        onSuccess: () => router.push('/orders?placed=1'),
        onPending: () => router.push('/orders?placed=1'),
        onError: () => showToast({ type: 'error', message: 'Pembayaran gagal. Silakan coba lagi.' }),
        onClose: () => {
          showToast({
            type: 'info',
            message: `Pesanan tersimpan. Lanjutkan pembayaran dari Pesanan Saya dalam ${PAYMENT_WINDOW_MINUTES} menit.`,
          });
          router.push('/orders');
        },
      });
      if (!opened) {
        showToast({
          type: 'error',
          message: 'Pembayaran belum siap. Lanjutkan dari Pesanan Saya sebentar lagi.',
        });
        router.push('/orders');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setFormError('Terjadi kesalahan. Periksa koneksi Anda lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar onOpenModal={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <SnapScript />

      <main className="min-h-[100dvh] bg-white px-4 pb-16 pt-20 text-black transition-colors duration-300 dark:bg-slate-950 dark:text-white md:px-6">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/shop"
            className="group mb-2 flex w-fit items-center gap-2 py-2 text-black/60 transition-colors hover:text-black dark:text-white/60 dark:hover:text-white"
          >
            <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1" />
            <span className="font-sans text-sm font-medium">Kembali ke Shop</span>
          </Link>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Photos */}
            <div>
              <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-black/5 dark:border-white/10 dark:bg-white/5">
                {photo ? (
                  <img src={photo} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <ShoppingBag size={48} strokeWidth={1.25} className="opacity-40" />
                )}
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-6 gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => setCurrent(idx)}
                      aria-label={`Foto ${idx + 1}`}
                      className={`aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                        idx === current
                          ? 'border-violet-500'
                          : 'border-black/10 hover:border-violet-500/40 dark:border-white/10'
                      }`}
                    >
                      <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details & checkout */}
            <div className="space-y-6">
              <div>
                <h1 className="mb-2 font-serif text-3xl italic md:text-4xl">{product.name}</h1>
                <p className="font-sans text-2xl font-black">{formatIdr(product.price_idr)}</p>
                <p
                  className={`mt-1 font-sans text-xs font-bold ${
                    soldOut ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {soldOut ? 'Stok habis' : `Stok tersedia: ${product.stock}`}
                </p>
              </div>

              {product.description && (
                <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-black/70 dark:text-white/70">
                  {product.description}
                </p>
              )}

              {!soldOut && !checkingOut && (
                <div className="space-y-4 rounded-2xl border border-black/5 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between">
                    <span className={labelClass}>Jumlah</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        aria-label="Kurangi jumlah"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 transition-colors hover:bg-black/5 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/10"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-10 text-center font-sans text-base font-bold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                        disabled={quantity >= maxQuantity}
                        aria-label="Tambah jumlah"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 transition-colors hover:bg-black/5 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/10"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={startCheckout}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 font-sans text-[11px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-violet-700"
                  >
                    <ShoppingBag size={15} />
                    Beli Sekarang
                  </button>
                  {!user && (
                    <p className="text-center font-sans text-[11px] text-black/50 dark:text-white/50">
                      Masuk dulu untuk membeli.
                    </p>
                  )}
                </div>
              )}

              {!soldOut && checkingOut && (
                <form
                  onSubmit={pay}
                  className="space-y-4 rounded-2xl border border-black/5 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <h2 className="flex items-center gap-2 font-serif text-xl italic">
                    <Truck size={18} strokeWidth={1.5} />
                    Alamat Pengiriman
                  </h2>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="recipient_name" className={labelClass}>Nama penerima</label>
                      <input id="recipient_name" autoComplete="name" className={inputClass} {...field('recipient_name')} />
                    </div>
                    <div>
                      <label htmlFor="recipient_phone" className={labelClass}>Nomor HP</label>
                      <input
                        id="recipient_phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="08xxxxxxxxxx"
                        className={inputClass}
                        {...field('recipient_phone')}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="shipping_address" className={labelClass}>Alamat lengkap</label>
                    <textarea
                      id="shipping_address"
                      rows={3}
                      autoComplete="street-address"
                      placeholder="Jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
                      className={`${inputClass} resize-none`}
                      {...field('shipping_address')}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="shipping_city" className={labelClass}>Kota / kabupaten</label>
                      <input id="shipping_city" autoComplete="address-level2" className={inputClass} {...field('shipping_city')} />
                    </div>
                    <div>
                      <label htmlFor="shipping_postal_code" className={labelClass}>Kode pos</label>
                      <input
                        id="shipping_postal_code"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={5}
                        className={inputClass}
                        {...field('shipping_postal_code')}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="notes" className={labelClass}>Catatan (opsional)</label>
                    <input id="notes" maxLength={300} className={inputClass} {...field('notes')} />
                  </div>

                  <dl className="space-y-1.5 border-t border-black/5 pt-4 font-sans text-sm dark:border-white/10">
                    <div className="flex justify-between gap-3">
                      <dt className="min-w-0 text-black/60 dark:text-white/60">
                        {product.name} × {quantity}
                      </dt>
                      <dd className="shrink-0">{formatIdr(subtotal)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-black/60 dark:text-white/60">Ongkos kirim</dt>
                      <dd className="shrink-0">{shippingFee > 0 ? formatIdr(shippingFee) : 'Gratis'}</dd>
                    </div>
                    <div className="flex justify-between gap-3 pt-1 text-base font-black">
                      <dt>Total</dt>
                      <dd className="shrink-0">{formatIdr(subtotal + shippingFee)}</dd>
                    </div>
                  </dl>

                  {formError && (
                    <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 font-sans text-xs text-rose-700 dark:text-rose-300">
                      {formError}
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setCheckingOut(false)}
                      disabled={submitting}
                      className="min-h-[48px] flex-1 rounded-xl border border-black/10 px-4 font-sans text-[11px] font-black uppercase tracking-[0.2em] transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 font-sans text-[11px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
                    >
                      {submitting && <Loader2 size={15} className="animate-spin" />}
                      {submitting ? 'Menyiapkan...' : 'Bayar'}
                    </button>
                  </div>
                  <p className="font-sans text-[11px] leading-snug text-black/50 dark:text-white/50">
                    Stok disimpan untuk Anda selama {PAYMENT_WINDOW_MINUTES} menit sampai pembayaran selesai.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
