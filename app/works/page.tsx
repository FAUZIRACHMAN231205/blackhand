'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../component/Navbar';
import {
  ChevronLeft,
  Sparkles,
  Clock,
  MessageSquare,
  Images,
  ChevronDown,
  ChevronUp,
  Calendar,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import RatingStars from '../component/RatingStars';
import { LoadingSpinner, SkeletonCard } from '../component/LoadingStates';
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
}: {
  work: Work & { images?: WorkImage[] };
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [images, setImages] = useState<WorkImage[]>(work.images || []);
  const [commentCount, setCommentCount] = useState<number>(0);

  const isNew =
    Math.floor(
      (new Date().getTime() - new Date(work.created_at).getTime()) /
        (1000 * 60 * 60 * 24)
    ) < 3;

  useEffect(() => {
    const fetchCommentCount = async () => {
      try {
        const { count, error } = await supabase
          .from('work_comments')
          .select('*', { count: 'exact', head: true })
          .eq('work_id', work.id);
        
        if (!error && count !== null) {
          setCommentCount(count);
        }
      } catch (err) {
        console.error('Error fetching comment count:', err);
      }
    };
    fetchCommentCount();
  }, [work.id]);

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

    setExpanded(true);
  };

  const staggerClass = `feed-post-${Math.min(index + 1, 6)}`;

  return (
    <article
      className={`animate-fade-in-up ${staggerClass} relative bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300`}
    >
      {/* Post Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
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
        </div>
      )}

      {/* Post Content */}
      <div className="px-6 pt-4 pb-2 space-y-3">
        {/* Title + Category */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-cormorant font-semibold text-slate-900 dark:text-white leading-tight">
            {work.title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <RatingStars workId={work.id} readOnly showDetails={false} />
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
      <div className="px-6 pb-5 pt-2 border-t border-slate-100/50 dark:border-slate-800/20 mt-2">
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
            className="text-xs font-sans font-bold text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 transition-colors flex items-center gap-1"
          >
            <MessageSquare size={13} />
            Diskusi & Rating &rarr;
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
                  src={img.image_url}
                  alt={`${work.title} — ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {img.is_featured && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-400 text-black text-[9px] font-bold rounded-full shadow font-sans">
                    ⭐ Cover
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

// ─── Main Feed Page ────────────────────────────────────────────────────
export default function ActivityFeed() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_LOAD);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const fetchWorks = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('works')
        .select(
          'id, title, description, category, featured_image_url, is_featured, is_published, created_at'
        )
        .eq('is_published', true)
        .gt('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching works:', error);
      }

      // Fallback: if no recent works, get latest 12
      if (error || !data || data.length === 0) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('works')
          .select(
            'id, title, description, category, featured_image_url, is_featured, is_published, created_at'
          )
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(12);

        if (!fallbackError && fallbackData) {
          setWorks(fallbackData);
          setHasMore(fallbackData.length > POSTS_PER_LOAD);
        } else {
          setWorks([]);
          setHasMore(false);
        }
      } else {
        setWorks(data);
        setHasMore(data.length > POSTS_PER_LOAD);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingWorks(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchWorks();
    }
  }, [user, fetchWorks]);

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

  if (!user) {
    return null;
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
      <Navbar onOpenModal={() => {}} />

      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-4 md:p-6 transition-colors duration-300 relative overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-violet-400/8 dark:bg-violet-600/5 rounded-full blur-3xl pointer-events-none animate-float-slow" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-fuchsia-400/8 dark:bg-fuchsia-600/5 rounded-full blur-3xl pointer-events-none animate-float-slow-reverse" />

        <div className="max-w-2xl mx-auto relative z-10 space-y-8">
          {/* Back Button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group"
          >
            <ChevronLeft
              size={20}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span className="font-sans text-sm font-semibold">
              Back to Dashboard
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
            <h1 className="text-4xl md:text-5xl font-cormorant font-medium tracking-tight mb-2">
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
              <h2 className="text-2xl font-cormorant font-medium">
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
                        <FeedPost key={work.id} work={work} index={idx} />
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
