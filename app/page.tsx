'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ImageOff, ShoppingBag } from 'lucide-react';
import Navbar from './component/Navbar';
import AnnouncementBar from './component/AnnouncementBar';
import AuthModal from './component/AuthModal';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabaseClient';
import { formatIdr } from './lib/categories';
import { discountPercent, isNewArrival } from './lib/shop';
import Image from 'next/image';
import type { Work, Product } from './types';

const PREVIEW_WORK_COLUMNS =
  'id, title, description, category, featured_image_url, is_featured, is_published, created_at, price_idr, is_for_sale, sold_at';
const PREVIEW_COUNT = 6;

type LandingTab = 'works' | 'shop';

function HomeContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stayAtHome = searchParams.get('home') === 'true';

  const [activeTab, setActiveTab] = useState<LandingTab>('works');
  const [previewWorks, setPreviewWorks] = useState<Work[]>([]);
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(true);

  useEffect(() => {
    // Redirect ke dashboard jika sudah login (kecuali jika user memilih stay at home)
    if (!loading && user && !stayAtHome) {
      router.push('/dashboard');
    }
  }, [user, loading, router, stayAtHome]);

  // Both tabs' content is fetched once up front, so switching between "Karya"
  // and "Merchandise" is an instant client-side swap, not a fresh request.
  useEffect(() => {
    let ignore = false;
    (async () => {
      const [worksResult, shopResult] = await Promise.all([
        supabase
          .from('works')
          .select(PREVIEW_WORK_COLUMNS)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(PREVIEW_COUNT),
        fetch(`/api/shop/products?page=0`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      ]);
      if (ignore) return;
      setPreviewWorks((worksResult.data ?? []) as Work[]);
      setPreviewProducts(((shopResult?.products ?? []) as Product[]).slice(0, PREVIEW_COUNT));
      setLoadingPreview(false);
    })();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black dark:bg-slate-950">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <AnnouncementBar />
      <Navbar announcementBar onOpenModal={() => setIsModalOpen(true)} />

      <main className="relative w-full h-[100dvh] overflow-hidden bg-white dark:bg-slate-950">

        {/* Satu gambar responsif untuk semua ukuran layar. next/image otomatis
            menyajikan varian kecil ke mobile via `sizes`. Untuk seni terarah
            (crop potret khusus mobile), tambahkan kembali aset arte-mobile.jpeg
            dan pisahkan dengan <picture>/breakpoint. */}
        <div className="absolute inset-0">
          <Image
            src="/arte.jpeg"
            alt="Blackhand Background"
            fill
            sizes="100vw"
            className="object-cover object-center dark:opacity-85"
            priority
            draggable={false}
          />
        </div>

        {/* Enhanced Dark Art Vignette Overlay */}
        <div className="absolute inset-0 bg-black/10 dark:bg-black/30 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/40 to-black/95 dark:via-black/60 dark:to-black/100 pointer-events-none" />
      </main>

      {/* Below the hero, dropdead-style: the catalog is right here on the
          landing page, no click-through required. A tab swaps between the
          two different things Blackhand sells — art and merchandise —
          without leaving this page. */}
      <section className="bg-white px-6 py-16 transition-colors duration-300 dark:bg-slate-950 sm:px-10 sm:py-20 md:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 font-sans text-[10px] font-black uppercase tracking-[0.4em] text-violet-500">
                {activeTab === 'works' ? 'Dari Studio' : 'Dari Etalase'}
              </p>
              <h2 className="font-serif text-3xl italic sm:text-4xl md:text-5xl">
                {activeTab === 'works' ? 'Karya Terbaru' : 'Merchandise Terbaru'}
              </h2>
            </div>

            <div className="relative inline-grid w-fit grid-cols-2 rounded-full border border-black/10 bg-black/[0.03] p-0.5 dark:border-white/10 dark:bg-white/[0.04]">
              {/* Sliding indicator — animates position instead of swapping a flat bg color */}
              <div
                aria-hidden
                className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-black shadow-[0_0_12px_-2px_rgba(139,92,246,0.7)] transition-transform duration-300 ease-out dark:bg-white ${
                  activeTab === 'shop' ? 'translate-x-full' : 'translate-x-0'
                }`}
              />
              {(
                [
                  ['works', 'Karya'],
                  ['shop', 'Merchandise'],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={activeTab === tab}
                  className={`relative z-10 flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full px-4 font-sans text-[11px] font-black uppercase tracking-wide transition-colors duration-300 ${
                    activeTab === tab
                      ? 'text-white dark:text-black'
                      : 'text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loadingPreview ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
              {Array.from({ length: PREVIEW_COUNT }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
              ))}
            </div>
          ) : activeTab === 'works' ? (
            previewWorks.length === 0 ? (
              <p className="py-16 text-center font-sans text-sm text-black/50 dark:text-white/50">
                Belum ada karya yang dipublikasikan.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
                {previewWorks.map((work) => (
                  <Link key={work.id} href={`/works/${work.id}`} className="group">
                    <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-black/5 transition-colors group-hover:border-violet-500/30 dark:border-white/10 dark:bg-white/5">
                      {work.featured_image_url ? (
                        <img
                          src={work.featured_image_url}
                          alt={work.title}
                          loading="lazy"
                          className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center">
                          <ImageOff size={36} strokeWidth={1.25} className="opacity-40" />
                        </div>
                      )}
                      {work.sold_at ? (
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 font-sans text-[10px] font-black uppercase tracking-wider text-black">
                          Terjual
                        </span>
                      ) : (
                        work.is_for_sale &&
                        work.price_idr != null && (
                          <span className="absolute left-3 top-3 rounded-full bg-zinc-950/85 px-2.5 py-1 font-sans text-[10px] font-black tracking-wider text-white">
                            {formatIdr(work.price_idr)}
                          </span>
                        )
                      )}
                    </div>
                    <div className="mt-3">
                      <h3 className="line-clamp-1 font-serif text-base italic transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400 sm:text-lg">
                        {work.title}
                      </h3>
                      <p className="mt-0.5 font-sans text-xs uppercase tracking-wider text-black/50 dark:text-white/50">
                        {work.category}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : previewProducts.length === 0 ? (
            <p className="py-16 text-center font-sans text-sm text-black/50 dark:text-white/50">
              Belum ada produk yang dipublikasikan.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
              {previewProducts.map((product) => {
                const soldOut = product.stock <= 0;
                const pctOff = discountPercent(product.price_idr, product.compare_at_price_idr);
                const isNew = !soldOut && pctOff === null && isNewArrival(product.created_at);
                return (
                  <Link key={product.id} href={`/shop/${product.id}`} className="group">
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
                    <div className="mt-3">
                      <h3 className="line-clamp-1 font-serif text-base italic transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400 sm:text-lg">
                        {product.name}
                      </h3>
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <p className="font-sans text-xs font-bold">{formatIdr(product.price_idr)}</p>
                        {pctOff !== null && (
                          <p className="font-sans text-[11px] text-black/40 line-through dark:text-white/40">
                            {formatIdr(product.compare_at_price_idr as number)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-10 flex justify-center">
            <Link
              href={activeTab === 'works' ? '/works' : '/shop'}
              className="rounded-xl border border-black/10 bg-black/[0.03] px-8 py-3.5 font-sans text-[11px] font-black uppercase tracking-[0.2em] transition-colors hover:bg-black/5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/10"
            >
              Lihat Semua {activeTab === 'works' ? 'Karya' : 'Merchandise'}
            </Link>
          </div>
        </div>
      </section>

      {/* Tampilkan Modal di sini */}
      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black dark:bg-slate-950"><div className="text-white text-xl">Loading...</div></div>}>
      <HomeContent />
    </Suspense>
  );
}