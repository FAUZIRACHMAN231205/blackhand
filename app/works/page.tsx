'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../component/Navbar';
import AuthModal from '../component/AuthModal';
import {
  Star,
  ChevronLeft,
  Sparkles,
  Clock,
  MessageSquare,
  Images,
  ChevronDown,
  ChevronUp,
  Calendar,
  Loader2,
  Tag,
} from 'lucide-react';
import Link from 'next/link';
import RatingStars from '../component/RatingStars';
import { LoadingSpinner, SkeletonCard } from '../component/LoadingStates';
import LockedOverlay from '../component/LockedOverlay';
import { formatIdr } from '../lib/categories';
import type { Work, WorkImage } from '../types';

const POSTS_PER_LOAD = 6;

// ─── Relative timestamp ────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days} hari lalu`;
  if (days < 30) return `${Math.floor(days / 7)} minggu lalu`;
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Date group label ──────────────────────────────────────────────────
function getDateGroup(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hari Ini';
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return 'Minggu Ini';
  if (diffDays < 30) return 'Bulan Ini';
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

// ─── FeedPost component ────────────────────────────────────────────────
function FeedPost({
  work,
  index,
  stats,
  owned,
}: {
  work: Work & { images?: WorkImage[] };
  index: number;
  stats?: { average: number; count: number; comments: number } | null;
  owned: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [images, setImages] = useState<WorkImage[]>(work.images || []);
  const [originalUrls, setOriginalUrls] = useState<Record<string, string>>({});
  const commentCount = stats?.comments ?? 0;

  // Only the cover is a clean sample; every other preview is stored blurred.
  const forSale = Boolean(work.is_for_sale && work.price_idr);
  const locked = (img: WorkImage) => !owned && !img.is_featured;

  const isNew =
    Math.floor(
      (new Date().getTime() - new Date(work.created_at).getTime()) /
        (1000 * 60 * 60 * 24)
    ) < 3;

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    // Fetch images on first expand
    if (images.length === 0) {
      setLoadingImages(true);
      try {
        const { data, error } = await supabase
          .from('work_images')
          .select('*')
          .eq('work_id', work.id)
          .order('display_order', { ascending: true });

        if (!error && data) {
          setImages(data);
        }
      } catch (err) {
        console.error('Error loading images:', err);
      } finally {
        setLoadingImages(false);
      }
    }

    // Owners get the real images instead of blurred previews, fetched only
    // when the gallery is opened.
    if (owned && Object.keys(originalUrls).length === 0) {
      try {
        const res = await fetch(`/api/works/${work.id}/album`);
        const data: { images: { id: string; url: string }[] | null } = await res.json();
        setOriginalUrls(Object.fromEntries((data.images ?? []).map((i) => [i.id, i.url])));
      } catch (err) {
        console.error('Error loading album originals:', err);
      }
    }

    setExpanded(true);
  };

  const staggerClass = `feed-post-${Math.min(index + 1, 6)}`;

  return (
    <article
      className={`animate-fade-in-up ${staggerClass} relative bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300`}
    >
      {/* Post Header */}
      <div className="flex items-center justify-between px-4 md:px-6 pt-4 md:pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold font-sans shadow-md">
            BH
          </div>
          <div>
            <p className="text-xs font-sans font-bold text-slate-800 dark:text-slate-200">
              Blackhand Studio
            </p>
            <p className="text-[11px] font-sans text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {timeAgo(work.created_at)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-violet-600 dark:text-violet-400">
                <MessageSquare size={10} className="fill-violet-500/10" />
                {commentCount} Diskusi
              </span>
            </p>
          </div>
        </div>

        {isNew && (
          <span className="animate-pulse-glow inline-flex items-center gap-1 px-2.5 py-1 bg-violet-600 text-white text-[10px] font-sans font-bold uppercase tracking-wider rounded-full">
            <Sparkles size={10} />
            NEW
          </span>
        )}
      </div>

      {/* Featured Image */}
      {work.featured_image_url && (
        <div className="relative mx-4 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={work.featured_image_url}
            alt={work.title}
            className="w-full aspect-[16/10] object-cover"
            loading="lazy"
          />
          {(owned || (forSale && work.price_idr != null)) && (
            <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-zinc-950/85 px-2.5 py-1 font-sans text-[10px] font-black tracking-wider text-white backdrop-blur-md">
              <Tag size={10} strokeWidth={2} />
              {owned ? 'Dimiliki' : formatIdr(work.price_idr ?? 0)}
            </span>
          )}
        </div>
      )}

      {/* Post Content */}
      <div className="px-4 md:px-6 pt-4 pb-2 space-y-3">
        {/* Title + Category */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-serif italic font-semibold text-slate-900 dark:text-white leading-tight">
            {work.title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <RatingStars
              workId={work.id}
              readOnly
              showDetails={false}
              stats={stats ? { average: stats.average, count: stats.count } : null}
            />
            <span className="shrink-0 px-2.5 py-1 bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/30 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {work.category}
            </span>
          </div>
        </div>

        {/* Artist's Note */}
        {work.description && (
          <div className="flex items-start gap-2.5 bg-slate-50/80 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 rounded-xl p-3.5">
            <MessageSquare
              size={14}
              className="text-violet-500 mt-0.5 shrink-0"
            />
            <p className="text-sm font-sans text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
              {work.description}
            </p>
          </div>
        )}
      </div>

      {/* Expand / Collapse Images & Grid wrapper */}
      <div className="px-4 md:px-6 pb-5 pt-2 border-t border-slate-100/50 dark:border-slate-800/20 mt-2">
        {/* Buttons Row */}
        <div className="flex justify-between items-center py-2">
          <button
            onClick={handleExpand}
            className="flex items-center gap-2 text-xs font-sans font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors group"
          >
            {loadingImages ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Memuat gambar...</span>
              </>
            ) : expanded ? (
              <>
                <ChevronUp
                  size={14}
                  className="group-hover:-translate-y-0.5 transition-transform"
                />
                <span>Tutup galeri</span>
              </>
            ) : (
              <>
                <Images size={14} />
                <span>Lihat semua gambar →</span>
                <ChevronDown
                  size={14}
                  className="group-hover:translate-y-0.5 transition-transform"
                />
              </>
            )}
          </button>

          <Link
            href={`/gallery/${work.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/15 text-violet-600 dark:text-violet-400 rounded-full transition-colors font-sans text-[11px] font-bold"
          >
            <MessageSquare size={12} strokeWidth={1.5} />
            Diskusi &amp; Rating
          </Link>
        </div>

        {/* Expanded Image Grid */}
        {expanded && images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 animate-fade-in-up">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="relative group rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-square"
              >
                <img
                  src={originalUrls[img.id] ?? img.image_url}
                  alt={`${work.title} — ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {locked(img) && <LockedOverlay compact />}
                {img.is_featured && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-400 text-black text-[9px] font-bold rounded-full shadow font-sans z-10">
                    <Star size={10} className="inline -mt-0.5 mr-1 fill-current" />Cover
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {expanded && images.length === 0 && !loadingImages && (
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 font-sans">
            Tidak ada gambar tambahan.
          </p>
        )}
      </div>
    </article>
  );
}

const FEED_COLUMNS =
  'id, title, description, category, featured_image_url, is_featured, is_published, created_at, price_idr, is_for_sale';

/**
 * Works published in the last 30 days, newest first — or, when there are
 * none, the latest 12 so the feed is never empty. An empty list on failure.
 */
async function loadFeedWorks(): Promise<Work[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('works')
      .select(FEED_COLUMNS)
      .eq('is_published', true)
      .gt('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching works:', error);
    if (!error && data && data.length > 0) return data;

    const { data: fallbackData, error: fallbackError } = await supabase
      .from('works')
      .select(FEED_COLUMNS)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(12);

    return !fallbackError && fallbackData ? fallbackData : [];
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// ─── Main Feed Page ────────────────────────────────────────────────────
export default function ActivityFeed() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_LOAD);
  const [hasMore, setHasMore] = useState(true);
  const [statsMap, setStatsMap] = useState<Record<string, { average: number; count: number; comments: number }>>({});
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [authOpen, setAuthOpen] = useState(false);

  // One request tells us every album this visitor owns, so cards can show
  // "Dimiliki" instead of a price without a per-card ownership check.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOwnedIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me/albums');
        if (!res.ok) return;
        const data: { workIds: string[] } = await res.json();
        if (!cancelled) setOwnedIds(new Set(data.workIds));
      } catch (err) {
        console.error('Error loading owned albums:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    // Public feed: published works load regardless of auth state.
    let ignore = false;
    loadFeedWorks().then((list) => {
      if (ignore) return;
      setWorks(list);
      setHasMore(list.length > POSTS_PER_LOAD);
      setLoadingWorks(false);
    });
    return () => {
      ignore = true;
    };
  }, []);

  // One aggregated request for every visible card's rating + comment count,
  // instead of two Supabase reads per FeedPost.
  useEffect(() => {
    if (works.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const ids = works.map((w) => w.id).join(',');
        const res = await fetch(`/api/works/ratings/summary?ids=${encodeURIComponent(ids)}`);
        if (res.ok && !cancelled) {
          const { stats } = await res.json();
          setStatsMap(stats || {});
        }
      } catch (err) {
        console.error('Error fetching rating summary:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [works]);

  const handleLoadMore = () => {
    const newCount = visibleCount + POSTS_PER_LOAD;
    setVisibleCount(newCount);
    if (newCount >= works.length) {
      setHasMore(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // ── Group works by date ─────────────────────────────────────────────
  const visibleWorks = works.slice(0, visibleCount);
  const groupedWorks: { label: string; items: Work[] }[] = [];

  visibleWorks.forEach((work) => {
    const label = getDateGroup(work.created_at);
    const existing = groupedWorks.find((g) => g.label === label);
    if (existing) {
      existing.items.push(work);
    } else {
      groupedWorks.push({ label, items: [work] });
    }
  });

  // Global index for stagger animation
  let globalIndex = 0;

  return (
    <>
      <Navbar onOpenModal={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-4 md:p-6 transition-colors duration-300 relative overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-violet-400/8 dark:bg-violet-600/5 rounded-full blur-3xl pointer-events-none animate-float-slow" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-fuchsia-400/8 dark:bg-fuchsia-600/5 rounded-full blur-3xl pointer-events-none animate-float-slow-reverse" />

        <div className="max-w-2xl mx-auto relative z-10 space-y-8">
          {/* Back Button */}
          <button
            onClick={() => router.push(user ? '/dashboard' : '/')}
            className="flex items-center gap-2 py-2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group"
          >
            <ChevronLeft
              size={20}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span className="font-sans text-sm font-semibold">
              {user ? 'Back to Dashboard' : 'Back to Home'}
            </span>
          </button>

          {/* Header */}
          <div className="border-b border-black/5 dark:border-white/5 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles
                className="text-violet-500 animate-pulse"
                size={20}
              />
              <span className="text-xs font-sans font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Activity Feed
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif italic font-medium tracking-tight mb-2">
              What&apos;s New
            </h1>
            <p className="text-black/60 dark:text-white/60 text-base font-sans">
              Update terbaru dari studio — karya baru, proses kreatif, dan
              cerita di balik layar.
            </p>
          </div>

          {/* Feed Content */}
          {loadingWorks ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : works.length === 0 ? (
            <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-16 text-center max-w-xl mx-auto space-y-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                <Clock
                  className="text-slate-400 dark:text-slate-500"
                  size={28}
                />
              </div>
              <h2 className="text-2xl font-serif italic font-medium">
                Belum Ada Update
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-sans">
                Belum ada karya baru yang dipublikasikan. Nantikan update dari
                studio!
              </p>
              <Link
                href="/gallery"
                className="inline-block px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider rounded-xl font-sans"
              >
                Jelajahi Collection
              </Link>
            </div>
          ) : (
            <div className="space-y-10">
              {groupedWorks.map((group) => (
                <section key={group.label}>
                  {/* Date Group Divider */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-2 shrink-0">
                      <Calendar
                        size={14}
                        className="text-violet-500"
                      />
                      <span className="text-xs font-sans font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                        {group.label}
                      </span>
                    </div>
                    <div className="flex-grow h-px bg-gradient-to-r from-violet-500/20 to-transparent" />
                  </div>

                  {/* Feed Posts */}
                  <div className="space-y-6">
                    {group.items.map((work) => {
                      const idx = globalIndex++;
                      return (
                        <FeedPost
                          key={work.id}
                          work={work}
                          index={idx}
                          stats={statsMap[work.id] ?? null}
                          owned={ownedIds.has(work.id)}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-4 pb-8">
                  <button
                    onClick={handleLoadMore}
                    className="flex items-center gap-2 px-8 py-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/40 text-slate-700 dark:text-slate-300 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-all font-sans text-sm font-bold"
                  >
                    <ChevronDown size={16} />
                    Muat Lebih Banyak
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-slate-400 dark:text-slate-500">
            <span>
              Menampilkan {Math.min(visibleCount, works.length)} dari{' '}
              {works.length} update terbaru.
            </span>
            <Link
              href="/gallery"
              className="font-bold text-black dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            >
              Jelajahi Collection Lengkap &rarr;
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
