'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../component/Navbar';
import AuthModal from '../component/AuthModal';
import { ChevronLeft, Star, ImageOff, Tag, ChevronDown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import RatingStars from '../component/RatingStars';
import { LoadingSpinner, SkeletonGrid } from '../component/LoadingStates';
import type { Work } from '../types';
import { WORK_CATEGORIES, formatIdr } from '../lib/categories';
import { GALLERY_PAGE_SIZE, pageRange, splitPage } from '../lib/pagination';

const WORK_COLUMNS =
  'id, title, description, category, featured_image_url, is_featured, is_published, created_at, price_idr, is_for_sale';

type RatingStats = Record<string, { average: number; count: number } | null>;

/** One page of published works, newest first, optionally narrowed to a category. */
async function loadWorksPage(category: string | null, page: number) {
  const [from, to] = pageRange(page, GALLERY_PAGE_SIZE);
  let query = supabase.from('works').select(WORK_COLUMNS).eq('is_published', true);
  if (category) query = query.eq('category', category);

  const { data, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) {
    console.error('Error fetching works:', error);
    return { items: [] as Work[], hasMore: false };
  }
  return splitPage((data ?? []) as Work[], GALLERY_PAGE_SIZE);
}

/**
 * The featured showcase is its own small query: paging must not decide whether
 * the highlighted work happens to be on screen.
 */
async function loadFeaturedWorks(): Promise<Work[]> {
  const { data, error } = await supabase
    .from('works')
    .select(WORK_COLUMNS)
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error fetching featured works:', error);
    return [];
  }
  return (data ?? []) as Work[];
}

/** How many published works exist in total, for the stats strip. */
async function loadPublishedCount(): Promise<number> {
  const { count, error } = await supabase
    .from('works')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);

  if (error) {
    console.error('Error counting works:', error);
    return 0;
  }
  return count ?? 0;
}

/** Ratings and comment counts for a page of cards, in one request. */
async function loadRatingStats(ids: string[]): Promise<RatingStats> {
  // Works with no ratings are absent from the response; seed them as null so
  // they count as fetched and aren't asked for again on the next page.
  const seeded: RatingStats = Object.fromEntries(ids.map((id) => [id, null]));
  try {
    const res = await fetch(`/api/works/ratings/summary?ids=${encodeURIComponent(ids.join(','))}`);
    if (!res.ok) return seeded;
    const { stats } = await res.json();
    return { ...seeded, ...(stats ?? {}) };
  } catch (err) {
    console.error('Error fetching rating summary:', err);
    return seeded;
  }
}

export default function Gallery() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [featuredWorks, setFeaturedWorks] = useState<Work[]>([]);
  const [publishedCount, setPublishedCount] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [ratingStats, setRatingStats] = useState<RatingStats>({});
  const [authOpen, setAuthOpen] = useState(false);

  const CATEGORIES = WORK_CATEGORIES;

  useEffect(() => {
    // Runs for the first page and again for each "load more" or category change;
    // `ignore` drops a page that arrives after the category moved on.
    let ignore = false;
    loadWorksPage(selectedCategory, page).then((result) => {
      if (ignore) return;
      setWorks((prev) => (page === 0 ? result.items : [...prev, ...result.items]));
      setHasMore(result.hasMore);
      setLoadingWorks(false);
      setLoadingMore(false);
    });
    return () => {
      ignore = true;
    };
  }, [selectedCategory, page]);

  useEffect(() => {
    let ignore = false;
    loadFeaturedWorks().then((list) => {
      if (!ignore) setFeaturedWorks(list);
    });
    loadPublishedCount().then((count) => {
      if (!ignore) setPublishedCount(count);
    });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    // Only ask about cards we haven't asked about yet.
    const missing = works.map((w) => w.id).filter((id) => !(id in ratingStats));
    if (missing.length === 0) return;

    let ignore = false;
    loadRatingStats(missing).then((stats) => {
      if (!ignore) setRatingStats((prev) => ({ ...prev, ...stats }));
    });
    return () => {
      ignore = true;
    };
  }, [works, ratingStats]);

  const showCategory = (category: string | null) => {
    if (category === selectedCategory) return;
    setSelectedCategory(category);
    setWorks([]);
    setPage(0);
    setHasMore(false);
    setLoadingWorks(true);
  };

  const loadMore = () => {
    setLoadingMore(true);
    setPage((prev) => prev + 1);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Navbar onOpenModal={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-6 md:p-20 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Back to Dashboard Button */}
          <button
            onClick={() => router.push(user ? '/dashboard' : '/')}
            className="flex items-center gap-2 py-2 mb-6 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-sans text-sm font-medium">{user ? 'Back to Dashboard' : 'Back to Home'}</span>
          </button>

          {/* Header Section */}
          <div className="mb-12">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl italic font-medium mb-2">
              Gallery
            </h1>
            <p className="font-sans text-black/60 dark:text-white/60 text-lg">
              Explore my artistic portfolio and creative projects
            </p>
          </div>

          {/* Featured Showcase */}
          {featuredWorks.length > 0 && (
            <div className="mb-16">
              <h2 className="font-serif text-2xl italic mb-6 text-black/80 dark:text-white/80">Featured</h2>
              <div className="grid grid-cols-1 gap-6">
                {featuredWorks.map((work) => (
                  <Link key={work.id} href={`/gallery/${work.id}`} className="group">
                    <div className="relative overflow-hidden rounded-2xl border border-black/5 dark:border-white/10">
                      {work.featured_image_url && (
                        <img
                          src={work.featured_image_url}
                          alt={work.title}
                          loading="lazy"
                          className="w-full h-96 object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-8">
                        <div className="text-white">
                          <span className="inline-block px-3 py-1 bg-amber-400 text-black font-sans text-[10px] font-bold uppercase tracking-wider rounded-full mb-3">
                            <Star size={11} className="inline -mt-0.5 mr-1 fill-current" />Featured
                          </span>
                          <h3 className="font-serif text-2xl italic">{work.title}</h3>
                          <p className="font-sans text-sm opacity-80 mt-1">{work.category}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Categories Filter */}
          <div className="mb-10">
            <h3 className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-black/60 dark:text-white/60 mb-4 px-1">
              Filter by Category
            </h3>
            <div className="flex flex-nowrap md:flex-wrap overflow-x-auto md:overflow-visible hide-scrollbar pb-2 md:pb-0 gap-x-6 md:gap-x-8 px-1">
              <button
                onClick={() => showCategory(null)}
                className={`relative py-2 font-sans text-xs font-bold uppercase tracking-[0.15em] transition-colors ${
                  selectedCategory === null
                    ? 'text-black dark:text-white'
                    : 'text-black/60 dark:text-white/60 hover:text-black/70 dark:hover:text-white/70'
                }`}
              >
                All
                {selectedCategory === null && (
                  <span className="absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-violet-500" />
                )}
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => showCategory(cat)}
                  className={`relative py-2 font-sans text-xs font-bold uppercase tracking-[0.15em] transition-colors ${
                    selectedCategory === cat
                      ? 'text-black dark:text-white'
                      : 'text-black/60 dark:text-white/60 hover:text-black/70 dark:hover:text-white/70'
                  }`}
                >
                  {cat}
                  {selectedCategory === cat && (
                    <span className="absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-violet-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Works Grid */}
          {loadingWorks ? (
            <SkeletonGrid count={6} />
          ) : works.length === 0 ? (
            <div className="bg-black/[0.02] dark:bg-slate-900/40 border border-dashed border-black/10 dark:border-white/10 rounded-2xl p-12 text-center">
              <div className="mb-4">
                <ImageOff size={36} strokeWidth={1.25} className="opacity-40" />
              </div>
              <h2 className="font-serif text-2xl italic mb-2 text-black/90 dark:text-white/90">No Works Found</h2>
              <p className="font-sans text-sm text-black/60 dark:text-white/60">
                {selectedCategory
                  ? `No artworks in ${selectedCategory} category yet`
                  : 'No artworks published yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {works.map((work) => (
                <Link key={work.id} href={`/gallery/${work.id}`} className="group">
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 group-hover:border-violet-500/30 transition-colors">
                      {work.featured_image_url ? (
                        <img
                          src={work.featured_image_url}
                          alt={work.title}
                          loading="lazy"
                          className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full aspect-square flex items-center justify-center bg-black/10 dark:bg-white/10">
                          <ImageOff size={36} strokeWidth={1.25} className="opacity-40" />
                        </div>
                      )}
                      {work.is_for_sale && work.price_idr != null && (
                        <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-zinc-950/85 px-2.5 py-1 font-sans text-[10px] font-black tracking-wider text-white backdrop-blur-md">
                          <Tag size={10} strokeWidth={2} />
                          {formatIdr(work.price_idr)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-serif text-lg italic line-clamp-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {work.title}
                      </h3>
                      <div className="flex justify-between items-center mt-1.5">
                        <p className="font-sans text-xs uppercase tracking-wider text-black/50 dark:text-white/50">{work.category}</p>
                        <RatingStars workId={work.id} readOnly showDetails={false} stats={ratingStats[work.id] ?? null} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {hasMore && !loadingWorks && (
            <div className="flex justify-center pt-10">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex min-h-[48px] items-center gap-2 rounded-2xl border border-black/10 bg-black/[0.03] px-8 font-sans text-sm font-bold text-black transition-colors hover:bg-black/5 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/10"
              >
                {loadingMore ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
                {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="mt-10 sm:mt-16 pt-6 sm:pt-8 border-t border-black/10 dark:border-white/10">
            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              <div>
                <p className="font-serif text-2xl sm:text-3xl italic text-black dark:text-white">{publishedCount ?? works.length}</p>
                <p className="font-sans text-[10px] sm:text-xs uppercase tracking-wider text-black/50 dark:text-white/50 mt-0.5 sm:mt-1">Total Works</p>
              </div>
              <div>
                <p className="font-serif text-2xl sm:text-3xl italic text-black dark:text-white">{CATEGORIES.length}</p>
                <p className="font-sans text-[10px] sm:text-xs uppercase tracking-wider text-black/50 dark:text-white/50 mt-0.5 sm:mt-1">Categories</p>
              </div>
              <div>
                <p className="font-serif text-2xl sm:text-3xl italic text-black dark:text-white">{featuredWorks.length}</p>
                <p className="font-sans text-[10px] sm:text-xs uppercase tracking-wider text-black/50 dark:text-white/50 mt-0.5 sm:mt-1">Featured Works</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
