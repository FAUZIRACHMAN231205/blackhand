'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '../component/Navbar';
import AuthModal from '../component/AuthModal';
import SiteFooter from '../component/SiteFooter';
import { Button, CatalogCard, EmptyState, FilterTabs, PageHeader, Price, Tag, type FilterTab } from '../component/ui';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { WORK_CATEGORIES, isValidCategory } from '../lib/categories';
import { GALLERY_PAGE_SIZE, pageRange, splitPage } from '../lib/pagination';
import { publicSaleStatus } from '../lib/sales';
import type { Work } from '../types';

const WORK_COLUMNS =
  'id, title, description, category, featured_image_url, is_featured, is_published, created_at, price_idr, is_for_sale, sold_at';

/** "Tersedia": works that can be bought right now. */
const AVAILABLE = 'available';

/** One filter row: everything, a category, or only what is for sale. */
type Filter = string | null;

const FILTERS: FilterTab<Filter>[] = [
  { value: null, label: 'Semua' },
  ...WORK_CATEGORIES.map((c) => ({ value: c, label: c })),
  { value: AVAILABLE, label: 'Tersedia' },
];

/** Read the filter from the URL (?category=… or ?filter=available). */
function filterFrom(params: URLSearchParams): Filter {
  if (params.get('filter') === AVAILABLE) return AVAILABLE;
  const category = params.get('category');
  return isValidCategory(category) ? category : null;
}

function filterHref(filter: Filter): string {
  if (filter === AVAILABLE) return `/gallery?filter=${AVAILABLE}`;
  return filter ? `/gallery?category=${encodeURIComponent(filter)}` : '/gallery';
}

/** One page of published works, newest first, narrowed by the filter. */
async function loadWorksPage(filter: Filter, page: number) {
  const [from, to] = pageRange(page, GALLERY_PAGE_SIZE);
  let query = supabase.from('works').select(WORK_COLUMNS).eq('is_published', true);
  if (filter === AVAILABLE) {
    query = query.eq('is_for_sale', true).is('sold_at', null).not('price_idr', 'is', null);
  } else if (filter) {
    query = query.eq('category', filter);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) {
    console.error('Error fetching works:', error);
    return { items: [] as Work[], hasMore: false, failed: true };
  }
  return { ...splitPage((data ?? []) as Work[], GALLERY_PAGE_SIZE), failed: false };
}

async function loadPublishedCount(): Promise<number | null> {
  const { count, error } = await supabase
    .from('works')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);
  if (error) {
    console.error('Error counting works:', error);
    return null;
  }
  return count;
}

/** The works this visitor owns, in one request, so cards can say "Milik Anda". */
function useOwnedWorkIds(signedIn: boolean) {
  const [owned, setOwned] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch('/api/me/albums')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { workIds: string[] } | null) => {
        if (!cancelled && data) setOwned(new Set(data.workIds));
      })
      .catch((err) => console.error('Error loading owned works:', err));
    return () => {
      cancelled = true;
    };
  }, [signedIn]);
  return signedIn ? owned : new Set<string>();
}

function WorkCard({ work, owned }: { work: Work; owned: boolean }) {
  const status = publicSaleStatus(work);
  const tags = owned ? (
    <Tag>Milik Anda</Tag>
  ) : status === 'sold' ? (
    <Tag variant="solid">Terjual</Tag>
  ) : work.is_featured ? (
    <Tag>Pilihan</Tag>
  ) : null;

  const aside = owned ? (
    'Milik Anda'
  ) : status === 'sold' ? (
    'Terjual'
  ) : status === 'available' || status === 'reserved' ? (
    <Price amount={work.price_idr ?? 0} size="sm" />
  ) : null;

  return (
    <CatalogCard
      href={`/gallery/${work.id}`}
      imageUrl={work.featured_image_url}
      title={work.title}
      meta={work.category}
      aside={aside}
      tags={tags}
    />
  );
}

function GalleryContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // The URL is the one source of truth for the filter, so menu links
  // (/gallery?category=Paintings) work while the page is open, and a filtered
  // view survives a refresh or a shared link.
  const filter = filterFrom(searchParams);
  const ownedIds = useOwnedWorkIds(Boolean(user));

  const [works, setWorks] = useState<Work[]>([]);
  const [publishedCount, setPublishedCount] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // A new filter starts again from an empty first page. Adjusted during
  // render, not in an effect, so the old filter's cards never paint under
  // the new one.
  const [shownFilter, setShownFilter] = useState(filter);
  if (filter !== shownFilter) {
    setShownFilter(filter);
    setWorks([]);
    setPage(0);
    setHasMore(false);
    setLoading(true);
  }

  useEffect(() => {
    // `ignore` drops a page that arrives after the filter moved on.
    let ignore = false;
    loadWorksPage(filter, page).then((result) => {
      if (ignore) return;
      setWorks((prev) => (page === 0 ? result.items : [...prev, ...result.items]));
      setHasMore(result.hasMore);
      setFailed(result.failed);
      setLoading(false);
      setLoadingMore(false);
    });
    return () => {
      ignore = true;
    };
  }, [filter, page]);

  useEffect(() => {
    let ignore = false;
    loadPublishedCount().then((count) => {
      if (!ignore) setPublishedCount(count);
    });
    return () => {
      ignore = true;
    };
  }, []);

  const showFilter = (next: Filter) => {
    router.replace(filterHref(next), { scroll: false });
  };

  const loadMore = () => {
    setLoadingMore(true);
    setPage((prev) => prev + 1);
  };

  const emptyText =
    filter === AVAILABLE
      ? 'Belum ada karya yang bisa dibeli saat ini. Lihat semua karya untuk menikmati arsipnya.'
      : filter
        ? `Belum ada karya di kategori ${filter}.`
        : 'Karya yang dipublikasikan studio akan muncul di sini.';

  return (
    <>
      <Navbar onOpenModal={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="min-h-[100dvh] bg-paper px-4 pb-20 pt-20 text-ink sm:px-6 md:px-8 md:pt-28">
        <div className="mx-auto grid max-w-7xl gap-8">
          <PageHeader
            eyebrow={publishedCount === null ? 'Arsip studio' : `Arsip studio · ${publishedCount} karya`}
            title="Karya"
            description="Terbaru di atas. Setiap karya dijual kepada satu pemilik saja."
          />

          <FilterTabs label="Saring karya" items={FILTERS} value={filter} onChange={showFilter} />

          {loading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Memuat karya">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid gap-2.5">
                  <div className="aspect-square animate-pulse bg-sheet" />
                  <div className="h-5 w-3/4 animate-pulse bg-sheet" />
                </div>
              ))}
            </div>
          ) : failed && works.length === 0 ? (
            <EmptyState
              title="Karya gagal dimuat"
              description="Periksa koneksi Anda, lalu muat ulang halaman."
              action={
                <Button variant="secondary" onClick={() => window.location.reload()}>
                  Muat ulang
                </Button>
              }
            />
          ) : works.length === 0 ? (
            <EmptyState
              title="Belum ada karya"
              description={emptyText}
              action={
                filter ? (
                  <Button variant="secondary" onClick={() => showFilter(null)}>
                    Lihat semua karya
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {works.map((work) => (
                <WorkCard key={work.id} work={work} owned={ownedIds.has(work.id)} />
              ))}
            </div>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center pt-4">
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
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

export default function GalleryPage() {
  return (
    <Suspense fallback={<main className="min-h-[100dvh] bg-paper" />}>
      <GalleryContent />
    </Suspense>
  );
}
