'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Loader2, PackageOpen, ShoppingBag, Truck } from 'lucide-react';
import Navbar from '../component/Navbar';
import AuthModal from '../component/AuthModal';
import { SkeletonGrid } from '../component/LoadingStates';
import { formatIdr } from '../lib/categories';
import type { Product } from '../types';

interface ShopPage {
  products: Product[];
  hasMore: boolean;
  shippingFeeIdr: number;
}

async function loadProducts(page: number): Promise<ShopPage | null> {
  try {
    const res = await fetch(`/api/shop/products?page=${page}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error fetching products:', err);
    return null;
  }
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    loadProducts(page).then((result) => {
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
  }, [page]);

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

          {loading ? (
            <SkeletonGrid count={6} />
          ) : failed && products.length === 0 ? (
            <p className="py-16 text-center font-sans text-sm text-rose-600 dark:text-rose-400">
              Gagal memuat produk. Muat ulang halaman untuk mencoba lagi.
            </p>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-12 text-center dark:border-white/10 dark:bg-slate-900/40">
              <PackageOpen size={36} strokeWidth={1.25} className="mx-auto mb-4 opacity-40" />
              <h2 className="mb-2 font-serif text-2xl italic">Belum Ada Produk</h2>
              <p className="font-sans text-sm text-black/60 dark:text-white/60">
                Merchandise baru segera hadir. Nantikan!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-8 lg:grid-cols-3">
              {products.map((product) => {
                const soldOut = product.stock <= 0;
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
                        {soldOut && (
                          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 font-sans text-[10px] font-black uppercase tracking-wider text-black">
                            Stok Habis
                          </span>
                        )}
                      </div>
                      <div>
                        <h2 className="line-clamp-2 font-serif text-base italic transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400 sm:text-lg">
                          {product.name}
                        </h2>
                        <p className="mt-1 font-sans text-sm font-bold">{formatIdr(product.price_idr)}</p>
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
