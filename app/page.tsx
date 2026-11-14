'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Navbar from './component/Navbar';
import AnnouncementBar from './component/AnnouncementBar';
import AuthModal from './component/AuthModal';
import SiteFooter from './component/SiteFooter';
import { ProductCard, WorkCard } from './component/CatalogCards';
import { Button } from './component/ui';
import { useAuth } from './hooks/useAuth';
import { useOwnedWorkIds } from './hooks/useOwnedWorkIds';
import { ACCOUNT_HOME } from './lib/routes';
import { supabase } from './lib/supabaseClient';
import type { Product, Work } from './types';

const PREVIEW_WORK_COLUMNS =
  'id, title, description, category, featured_image_url, is_featured, is_published, created_at, price_idr, is_for_sale, sold_at';
const WORK_COUNT = 8;
const PRODUCT_COUNT = 4;

type Load<T> = { state: 'loading' } | { state: 'ready'; items: T[] } | { state: 'failed' };

function SectionHeader({ id, title, href, linkLabel }: { id: string; title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-ink pb-3">
      <h2 id={id} className="font-sans text-2xl font-bold uppercase tracking-[-0.02em] sm:text-3xl">{title}</h2>
      <Button variant="ghost" size="sm" href={href} className="-mr-2">
        {linkLabel} →
      </Button>
    </div>
  );
}

function GridSkeleton({ count, label }: { count: number; label: string }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label={label}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="grid gap-2.5">
          <div className="aspect-square animate-pulse bg-sheet" />
          <div className="h-5 w-3/4 animate-pulse bg-sheet" />
        </div>
      ))}
    </div>
  );
}

function HomeContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // proxy.ts sends signed-out visitors of Akun/Admin here with ?masuk=1.
  const signInRequested = searchParams.get('masuk') === '1';
  const [isModalOpen, setIsModalOpen] = useState(signInRequested);
  const ownedIds = useOwnedWorkIds(Boolean(user));

  const [works, setWorks] = useState<Load<Work>>({ state: 'loading' });
  const [products, setProducts] = useState<Load<Product>>({ state: 'loading' });

  // Already signed in (e.g. the cookie was refreshed in another tab): no
  // dialog, go where they were headed.
  useEffect(() => {
    if (signInRequested && !loading && user) router.replace(ACCOUNT_HOME);
  }, [signInRequested, loading, user, router]);

  const closeModal = () => {
    setIsModalOpen(false);
    if (signInRequested) router.replace('/', { scroll: false });
  };

  useEffect(() => {
    let ignore = false;
    supabase
      .from('works')
      .select(PREVIEW_WORK_COLUMNS)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(WORK_COUNT)
      .then(({ data, error }) => {
        if (ignore) return;
        if (error) console.error('Error fetching latest works:', error);
        setWorks(error ? { state: 'failed' } : { state: 'ready', items: (data ?? []) as Work[] });
      });
    fetch('/api/shop/products?page=0')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { products: Product[] }) => {
        if (!ignore) setProducts({ state: 'ready', items: (data.products ?? []).slice(0, PRODUCT_COUNT) });
      })
      .catch((err) => {
        console.error('Error fetching products:', err);
        if (!ignore) setProducts({ state: 'failed' });
      });
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <>
      <AnnouncementBar />
      <Navbar announcementBar onOpenModal={() => setIsModalOpen(true)} />

      <main className="bg-paper text-ink">
        {/* Hero: one sentence, the two ways in, then the studio's picture. */}
        <section className="px-4 pb-10 pt-32 sm:px-6 md:px-8 md:pt-40">
          <div className="mx-auto grid max-w-7xl gap-8">
            <h1 className="max-w-5xl text-balance font-sans text-5xl font-bold uppercase leading-[0.92] tracking-[-0.04em] sm:text-7xl lg:text-8xl">
              Where shadow becomes form.
            </h1>
            <div className="flex flex-col gap-6 border-t border-ink pt-5 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-md font-sans text-base text-mute">
                Karya seni eksklusif dari studio Blackhand — setiap karya hanya untuk satu pemilik — dan merchandise
                resmi.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button href="/gallery">Lihat karya</Button>
                <Button variant="secondary" href="/shop">
                  Toko
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="px-4 sm:px-6 md:px-8">
          <div className="relative mx-auto aspect-[4/5] max-w-7xl overflow-hidden bg-sheet sm:aspect-[21/9]">
            <Image
              src="/arte.jpeg"
              alt="Karya studio Blackhand"
              fill
              sizes="(min-width: 1280px) 1280px, 100vw"
              className="object-cover object-center"
              priority
              draggable={false}
            />
          </div>
        </div>

        <section className="px-4 pt-16 sm:px-6 md:px-8 md:pt-24" aria-labelledby="latest-works">
          <div className="mx-auto grid max-w-7xl gap-8">
            <SectionHeader id="latest-works" title="Karya terbaru" href="/gallery" linkLabel="Semua karya" />

            {works.state === 'loading' ? (
              <GridSkeleton count={WORK_COUNT} label="Memuat karya" />
            ) : works.state === 'failed' ? (
              <p className="font-sans text-sm text-mute">Karya belum bisa dimuat. Coba muat ulang halaman.</p>
            ) : works.items.length === 0 ? (
              <p className="font-sans text-sm text-mute">Karya pertama studio segera hadir.</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
                {works.items.map((work) => (
                  <WorkCard key={work.id} work={work} owned={ownedIds.has(work.id)} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Merchandise supports the art: one row, below it. */}
        <section className="px-4 py-16 sm:px-6 md:px-8 md:py-24" aria-labelledby="merch">
          <div className="mx-auto grid max-w-7xl gap-8">
            <SectionHeader id="merch" title="Merchandise" href="/shop" linkLabel="Ke toko" />

            {products.state === 'loading' ? (
              <GridSkeleton count={PRODUCT_COUNT} label="Memuat merchandise" />
            ) : products.state === 'failed' ? (
              <p className="font-sans text-sm text-mute">Merchandise belum bisa dimuat. Coba muat ulang halaman.</p>
            ) : products.items.length === 0 ? (
              <p className="font-sans text-sm text-mute">Merchandise resmi segera hadir.</p>
            ) : (
              // Phones: one swipeable row. Wider: four columns.
              <div className="hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
                {products.items.map((product) => (
                  <div key={product.id} className="w-[44vw] max-w-[220px] shrink-0 snap-start md:w-auto md:max-w-none">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />

      <AuthModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<main className="min-h-[100dvh] bg-paper" />}>
      <HomeContent />
    </Suspense>
  );
}
