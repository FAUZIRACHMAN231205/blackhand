'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Loader2, PackageOpen, ShoppingBag, Truck } from 'lucide-react';
import Navbar from '../component/Navbar';
import AuthModal from '../component/AuthModal';
import { LoadingSpinner, SkeletonGrid } from '../component/LoadingStates';
import { formatIdr } from '../lib/categories';
import { discountPercent, isNewArrival } from '../lib/shop';
import type { Product } from '../types';

interface ShopPage {
  products: Product[];
  hasMore: boolean;
  shippingFeeIdr: number;
}

type ShopFilter = 'new' | 'sale' | null;

const FILTERS: { value: ShopFilter; label: string }[] = [
  { value: null, label: 'Semua' },
  { value: 'new', label: 'Baru' },
  { value: 'sale', label: 'Diskon' },
];

async function loadProducts(page: number, filter: ShopFilter): Promise<ShopPage | null> {
  try {
    const query = filter ? `&filter=${filter}` : '';
    const res = await fetch(`/api/shop/products?page=${page}${query}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error fetching products:', err);
    return null;
  }
}

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  // The URL is the one source of truth for the filter, so the navbar's
  // dropdown links (/shop?filter=sale) work even when the shop is already
  // open, and a filtered view survives a refresh or a shared link.
  const filter: ShopFilter = filterParam === 'new' || filterParam === 'sale' ? filterParam : null;

  const [products, setProducts] = useState<Product[]>([]);
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // A new filter starts again from an empty first page. Adjusted during render
  // rather than in an effect, so the previous filter's products never paint.
  const [shownFilter, setShownFilter] = useState(filter);
  if (filter !== shownFilter) {
    setShownFilter(filter);
    setProducts([]);
    setPage(0);
    setHasMore(false);
    setFailed(false);
    setLoading(true);
  }

  useEffect(() => {
    let ignore = false;
    loadProducts(page, filter).then((result) => {
      if (ignore) return;
      if (!result) {
        setFailed(true);
      } else {
        setProducts((prev) => (page === 0 ? result.products : [...prev, ...result.products]));
        setHasMore(result.hasMore);
        setShippingFee(result.shippingFeeIdr);
      }
      setLoading(false);
      setLoadingMore(false);
    });
    return () => {
      ignore = true;
    };
  }, [page, filter]);

  const showFilter = (next: ShopFilter) => {
    if (next === filter) return;
    router.replace(next ? `/shop?filter=${next}` : '/shop', { scroll: false });
  };

  return (
    <>
      <Navbar onOpenModal={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="min-h-[100dvh] bg-white p-6 pt-24 text-black transition-colors duration-300 dark:bg-slate-950 dark:text-white md:p-20">
        <div className="mx-auto max-w-7xl">
          <header className="mb-12">
            <h1 className="mb-2 font-serif text-4xl font-medium italic md:text-5xl lg:text-6xl">Shop</h1>
            <p className="font-sans text-lg text-black/60 dark:text-white/60">
              Aksesoris dan merchandise resmi Blackhand.
            </p>
            {shippingFee !== null && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.03] px-4 py-2 font-sans text-xs text-black/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
                <Truck size={14} strokeWidth={1.75} />
                {shippingFee > 0
                  ? `Ongkos kirim flat ${formatIdr(shippingFee)} per pesanan`
                  : 'Gratis ongkos kirim'}
              </p>
            )}
          </header>

          <div className="mb-8 flex gap-x-6 overflow-x-auto px-1 hide-scrollbar">
            {FILTERS.map(({ value, label }) => (
              <button
                key={label}
                onClick={() => showFilter(value)}
                className={`relative whitespace-nowrap py-2 font-sans text-xs font-bold uppercase tracking-[0.15em] transition-colors ${
                  filter === value
                    ? 'text-black dark:text-white'
                    : 'text-black/60 hover:text-black/70 dark:text-white/60 dark:hover:text-white/70'
                }`}
              >
                {label}
                {filter === value && <span className="absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-violet-500" />}
              </button>
            ))}
          </div>

          {loading ? (
            <SkeletonGrid count={6} />
          ) : failed && products.length === 0 ? (
            <p className="py-16 text-center font-sans text-sm text-rose-600 dark:text-rose-400">
              Gagal memuat produk. Muat ulang halaman untuk mencoba lagi.
            </p>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-12 text-center dark:border-white/10 dark:bg-slate-900/40">
              <PackageOpen size={36} strokeWidth={1.25} className="mx-auto mb-4 opacity-40" />
              <h2 className="mb-2 font-serif text-2xl italic">
                {filter === 'sale' ? 'Belum Ada Diskon' : filter === 'new' ? 'Belum Ada Produk Baru' : 'Belum Ada Produk'}
              </h2>
              <p className="font-sans text-sm text-black/60 dark:text-white/60">
                {filter === 'sale'
                  ? 'Saat ini tidak ada produk yang sedang didiskon.'
                  : filter === 'new'
                    ? 'Tidak ada produk yang baru ditambahkan dalam dua minggu terakhir.'
                    : 'Merchandise baru segera hadir. Nantikan!'}
              </p>
              {filter && (
                <button
                  onClick={() => showFilter(null)}
                  className="mt-6 inline-flex min-h-[44px] items-center rounded-xl border border-black/10 px-6 font-sans text-[11px] font-black uppercase tracking-[0.2em] transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                >
                  Lihat Semua Produk
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-8 lg:grid-cols-3">
              {products.map((product) => {
                const soldOut = product.stock <= 0;
                const pctOff = discountPercent(product.price_idr, product.compare_at_price_idr);
                const isNew = !soldOut && pctOff === null && isNewArrival(product.created_at);
                return (
                  <Link key={product.id} href={`/shop/${product.id}`} className="group">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-black/5 transition-colors group-hover:border-violet-500/30 dark:border-white/10 dark:bg-white/5">
                        {product.cover_image_url ? (
                          <img
                            src={product.cover_image_url}
                            alt={product.name}
                            loading="lazy"
                            className={`aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                              soldOut ? 'opacity-60 grayscale' : ''
                            }`}
                          />
                        ) : (
                          <div className="flex aspect-square w-full items-center justify-center">
                            <ShoppingBag size={36} strokeWidth={1.25} className="opacity-40" />
                          </div>
                        )}
                        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
                          {soldOut ? (
                            <span className="rounded-full bg-white/90 px-2.5 py-1 font-sans text-[10px] font-black uppercase tracking-wider text-black">
                              Stok Habis
                            </span>
                          ) : pctOff !== null ? (
                            <span className="rounded-full bg-rose-600 px-2.5 py-1 font-sans text-[10px] font-black uppercase tracking-wider text-white">
                              −{pctOff}%
                            </span>
                          ) : isNew ? (
                            <span className="rounded-full bg-violet-600 px-2.5 py-1 font-sans text-[10px] font-black uppercase tracking-wider text-white">
                              Baru
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <h2 className="line-clamp-2 font-serif text-base italic transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400 sm:text-lg">
                          {product.name}
                        </h2>
                        <div className="mt-1 flex items-baseline gap-2">
                          <p className="font-sans text-sm font-bold">{formatIdr(product.price_idr)}</p>
                          {pctOff !== null && (
                            <p className="font-sans text-xs text-black/40 line-through dark:text-white/40">
                              {formatIdr(product.compare_at_price_idr as number)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center pt-10">
              <button
                onClick={() => {
                  setLoadingMore(true);
                  setPage((prev) => prev + 1);
                }}
                disabled={loadingMore}
                className="flex min-h-[48px] items-center gap-2 rounded-2xl border border-black/10 bg-black/[0.03] px-8 font-sans text-sm font-bold transition-colors hover:bg-black/5 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/10"
              >
                {loadingMore ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
                {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ShopContent />
    </Suspense>
  );
}
