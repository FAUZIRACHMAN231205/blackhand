'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../component/Navbar';
import AuthModal from '../../component/AuthModal';
import SiteFooter from '../../component/SiteFooter';
import SnapScript, { openSnap } from '../../component/SnapScript';
import {
  Button,
  EmptyState,
  ImageViewer,
  Notice,
  Price,
  QuantityStepper,
  Tag,
  TextAreaField,
  TextField,
} from '../../component/ui';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { formatIdr } from '../../lib/categories';
import { PAYMENT_WINDOW_MINUTES } from '../../lib/sales';
import { ACCOUNT_ORDERS } from '../../lib/routes';
import {
  discountPercent,
  EMPTY_SHIPPING,
  MAX_ORDER_QUANTITY,
  parseShippingDetails,
  type ShippingDetails,
} from '../../lib/shop';
import type { Product, ProductImage } from '../../types';

type FieldErrors = Partial<Record<keyof ShippingDetails, string>>;

function SummaryRow({ label, value, strong = false }: { label: React.ReactNode; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between gap-4 border-t border-ink pt-3 text-base font-bold' : 'flex justify-between gap-4'}>
      <dt className={strong ? 'text-ink' : 'min-w-0 text-mute'}>{label}</dt>
      <dd className="shrink-0 tabular-nums">{value}</dd>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [shippingFee, setShippingFee] = useState(0);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [checkingOut, setCheckingOut] = useState(false);
  const [shipping, setShipping] = useState<ShippingDetails>(EMPTY_SHIPPING);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [id]);

  // On phones the form opens below the photos: bring it into view.
  useEffect(() => {
    if (checkingOut) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [checkingOut]);

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
    error: fieldErrors[key] ?? null,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setShipping((prev) => ({ ...prev, [key]: e.target.value }));
      // A fixed field stops shouting as soon as it is touched again.
      if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    },
  });

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !product) return;

    // Same rules the server applies, so most mistakes show before a round trip,
    // right under the field that needs fixing.
    const parsed = parseShippingDetails({ ...shipping });
    if (!parsed.ok) {
      setFieldErrors({ [parsed.field]: parsed.error });
      setFormError(null);
      document.getElementById(parsed.field)?.focus();
      return;
    }
    setFieldErrors({});
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
        setFormError(data.error || 'Gagal membuat pesanan. Coba lagi.');
        return;
      }

      const opened = openSnap(data.token, {
        onSuccess: () => router.push(`${ACCOUNT_ORDERS}?placed=1`),
        onPending: () => router.push(`${ACCOUNT_ORDERS}?placed=1`),
        onError: () => showToast({ type: 'error', message: 'Pembayaran gagal. Silakan coba lagi.' }),
        onClose: () => {
          showToast({
            type: 'info',
            message: `Pesanan tersimpan. Lanjutkan pembayaran dari Akun › Pesanan dalam ${PAYMENT_WINDOW_MINUTES} menit.`,
          });
          router.push(ACCOUNT_ORDERS);
        },
      });
      if (!opened) {
        showToast({ type: 'error', message: 'Pembayaran belum siap. Lanjutkan dari Akun › Pesanan sebentar lagi.' });
        router.push(ACCOUNT_ORDERS);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setFormError('Terjadi kesalahan. Periksa koneksi Anda lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const body = () => {
    if (loading) {
      return (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" aria-busy="true" aria-label="Memuat produk">
          <div className="aspect-square animate-pulse bg-sheet" />
          <div className="grid content-start gap-4">
            <div className="h-10 w-3/4 animate-pulse bg-sheet" />
            <div className="h-6 w-1/3 animate-pulse bg-sheet" />
            <div className="h-24 animate-pulse bg-sheet" />
          </div>
        </div>
      );
    }

    if (!product) {
      return (
        <EmptyState
          title="Produk tidak ditemukan"
          description="Produk ini mungkin sudah ditarik dari toko, atau alamatnya salah."
          action={<Button href="/shop">Kembali ke toko</Button>}
        />
      );
    }

    const soldOut = product.stock <= 0;
    const pctOff = discountPercent(product.price_idr, product.compare_at_price_idr);
    const maxQuantity = Math.max(1, Math.min(MAX_ORDER_QUANTITY, product.stock));
    const subtotal = product.price_idr * quantity;
    const photos = images.length > 0
      ? images.map((img) => ({ id: img.id, url: img.image_url }))
      : product.cover_image_url
        ? [{ id: 'cover', url: product.cover_image_url }]
        : [];

    return (
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        <ImageViewer images={photos} index={current} onIndexChange={setCurrent} alt={product.name} fit="cover" />

        <div className="grid min-w-0 gap-8 lg:sticky lg:top-24">
          <header className="grid gap-3 border-b border-ink pb-6">
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mute">Merchandise</p>
            <h1 className="break-words font-serif text-4xl font-medium italic leading-tight text-ink sm:text-5xl">
              {product.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <Price amount={product.price_idr} compareAt={product.compare_at_price_idr} size="lg" />
              {pctOff !== null && <Tag variant="sale">−{pctOff}%</Tag>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-sans text-xs text-mute">
              {soldOut ? <Tag variant="solid">Stok habis</Tag> : <span>Stok tersedia: {product.stock}</span>}
              <span>
                {shippingFee > 0 ? `Ongkos kirim flat ${formatIdr(shippingFee)} per pesanan` : 'Gratis ongkos kirim'}
              </span>
            </div>
          </header>

          {product.description && (
            <p className="whitespace-pre-wrap font-sans text-base leading-relaxed text-ink">{product.description}</p>
          )}

          {soldOut ? (
            <Notice title="Stok habis">Produk ini sedang tidak tersedia. Lihat merchandise lain di toko.</Notice>
          ) : !checkingOut ? (
            <div className="grid gap-4 border-t border-line pt-6">
              <QuantityStepper id="quantity" label="Jumlah" value={quantity} max={maxQuantity} onChange={setQuantity} />
              <Button variant="buy" fullWidth onClick={startCheckout}>
                Beli · {formatIdr(subtotal)}
              </Button>
              {!user && <p className="text-center font-sans text-xs text-mute">Masuk dulu untuk membeli.</p>}
            </div>
          ) : (
            <form ref={formRef} onSubmit={pay} noValidate className="grid scroll-mt-24 gap-8 border-t border-ink pt-6">
              <section className="grid gap-3">
                <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink">Pesanan</h2>
                <dl className="grid gap-2 font-sans text-sm">
                  <SummaryRow
                    label={
                      <>
                        <span className="font-serif text-base italic text-ink">{product.name}</span> × {quantity}
                      </>
                    }
                    value={formatIdr(subtotal)}
                  />
                </dl>
              </section>

              <section className="grid gap-5">
                <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink">Alamat pengiriman</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField id="recipient_name" label="Nama penerima" autoComplete="name" {...field('recipient_name')} />
                  <TextField
                    id="recipient_phone"
                    label="Nomor HP"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="08xxxxxxxxxx"
                    hint="Untuk kurir menghubungi Anda."
                    {...field('recipient_phone')}
                  />
                </div>
                <TextAreaField
                  id="shipping_address"
                  label="Alamat lengkap"
                  rows={3}
                  autoComplete="street-address"
                  placeholder="Jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
                  {...field('shipping_address')}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField id="shipping_city" label="Kota / kabupaten" autoComplete="address-level2" {...field('shipping_city')} />
                  <TextField
                    id="shipping_postal_code"
                    label="Kode pos"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={5}
                    {...field('shipping_postal_code')}
                  />
                </div>
                <TextField id="notes" label="Catatan" placeholder="Opsional" maxLength={300} {...field('notes')} />
              </section>

              <section className="grid gap-4">
                <dl className="grid gap-2 font-sans text-sm">
                  <SummaryRow label="Subtotal" value={formatIdr(subtotal)} />
                  <SummaryRow label="Ongkos kirim" value={shippingFee > 0 ? formatIdr(shippingFee) : 'Gratis'} />
                  <SummaryRow label="Total" value={formatIdr(subtotal + shippingFee)} strong />
                </dl>

                {formError && <Notice tone="error">{formError}</Notice>}

                <Button type="submit" variant="buy" fullWidth loading={submitting}>
                  {submitting ? 'Menyiapkan pembayaran' : `Bayar · ${formatIdr(subtotal + shippingFee)}`}
                </Button>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-sans text-xs text-mute">
                    Stok disimpan untuk Anda selama {PAYMENT_WINDOW_MINUTES} menit sampai pembayaran selesai.
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setCheckingOut(false)} disabled={submitting}>
                    Batal
                  </Button>
                </div>
              </section>
            </form>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Navbar onOpenModal={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <SnapScript />

      <main className="min-h-[100dvh] bg-paper px-4 pb-20 pt-20 text-ink sm:px-6 md:px-8 md:pt-24">
        <div className="mx-auto grid max-w-6xl gap-6">
          <div>
            <Button variant="ghost" size="sm" href="/shop" className="-ml-2">
              ← Kembali ke toko
            </Button>
          </div>
          {body()}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
