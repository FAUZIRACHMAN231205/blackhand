'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../component/Navbar';
import AuthModal from '../component/AuthModal';
import SiteFooter from '../component/SiteFooter';
import { ProductCard } from '../component/CatalogCards';
import { Button, EmptyState, FilterTabs, PageHeader, type FilterTab } from '../component/ui';
import { formatIdr } from '../lib/categories';
import type { Product } from '../types';

interface ShopPage {
  products: Product[];
  hasMore: boolean;
  shippingFeeIdr: number;
}

type ShopFilter = 'new' | 'sale' | null;

const FILTERS: FilterTab<ShopFilter>[] = [
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

const EMPTY: Record<'all' | 'new' | 'sale', { title: string; text: string }> = {
  all: { title: 'Belum ada produk', text: 'Merchandise baru segera hadir.' },
  new: { title: 'Belum ada produk baru', text: 'Tidak ada produk yang ditambahkan dalam dua minggu terakhir.' },
  sale: { title: 'Belum ada diskon', text: 'Saat ini tidak ada produk yang sedang didiskon.' },
};

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  // The URL is the one source of truth for the filter, so a filtered view
  // survives a refresh or a shared link.
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
    router.replace(next ? `/shop?filter=${next}` : '/shop', { scroll: false });
  };

  const empty = EMPTY[filter ?? 'all'];

  return (
    <>
      <Navbar onOpenModal={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="min-h-[100dvh] bg-paper px-4 pb-20 pt-20 text-ink sm:px-6 md:px-8 md:pt-28">
        <div className="mx-auto grid max-w-7xl gap-8">
          <PageHeader
            eyebrow="Merchandise resmi"
            title="Toko"
            description={
              shippingFee === null
                ? 'Aksesoris dan merchandise Blackhand.'
                : shippingFee > 0
                  ? `Aksesoris dan merchandise Blackhand. Ongkos kirim flat ${formatIdr(shippingFee)} per pesanan.`
                  : 'Aksesoris dan merchandise Blackhand. Gratis ongkos kirim.'
            }
          />

          <FilterTabs label="Saring produk" items={FILTERS} value={filter} onChange={showFilter} />

          {loading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Memuat produk">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid gap-2.5">
                  <div className="aspect-square animate-pulse bg-sheet" />
                  <div className="h-5 w-3/4 animate-pulse bg-sheet" />
                </div>
              ))}
            </div>
          ) : failed && products.length === 0 ? (
            <EmptyState
              title="Produk gagal dimuat"
              description="Periksa koneksi Anda, lalu muat ulang halaman."
              action={
                <Button variant="secondary" onClick={() => window.location.reload()}>
                  Muat ulang
                </Button>
              }
            />
          ) : products.length === 0 ? (
            <EmptyState
              title={empty.title}
              description={empty.text}
              action={
                filter ? (
                  <Button variant="secondary" onClick={() => showFilter(null)}>
                    Lihat semua produk
                  </Button>
                ) : (
                  <Button variant="secondary" href="/gallery">
                    Lihat karya
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center pt-4">
              <Button
                variant="secondary"
                loading={loadingMore}
                onClick={() => {
                  setLoadingMore(true);
                  setPage((prev) => prev + 1);
                }}
              >
                Muat lebih banyak
              </Button>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={<main className="min-h-[100dvh] bg-paper" />}>
      <ShopContent />
    </Suspense>
  );
}
