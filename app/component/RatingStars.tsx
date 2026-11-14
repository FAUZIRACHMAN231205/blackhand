'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Button, TextAreaField, cx, focusRing } from './ui';

interface RatingStarsProps {
  workId: string;
  userId?: string;
  readOnly?: boolean;
  size?: number;
  showDetails?: boolean;
  onRate?: (rating: number) => void;
  /**
   * Pre-aggregated rating for list/grid views. When provided (even as null),
   * the component uses it and skips its own Supabase read — this is how
   * grids avoid one query per card.
   */
  stats?: { average: number; count: number } | null;
}

interface RatingSnapshot {
  average: number;
  count: number;
  /** The viewer's own rating, 0 when they haven't rated (or aren't signed in). */
  userRating: number;
}

const COMMENT_MAX = 500;

/** Aggregate one work's ratings. Null on failure, so callers keep what they had. */
async function loadRatingStats(workId: string, userId?: string): Promise<RatingSnapshot | null> {
  try {
    const { data, error } = await supabase.from('work_ratings').select('rating, user_id').eq('work_id', workId);
    if (error) throw error;

    const rows = data ?? [];
    if (rows.length === 0) return { average: 0, count: 0, userRating: 0 };

    const sum = rows.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: Number((sum / rows.length).toFixed(1)),
      count: rows.length,
      userRating: (userId && rows.find((r) => r.user_id === userId)?.rating) || 0,
    };
  } catch (err) {
    console.error('Error fetching rating stats:', err);
    return null;
  }
}

/** Five stars in ink: filled, half, or outline. Monochrome like the rest of the site. */
function StarIcon({ fill, size }: { fill: 'full' | 'half' | 'empty'; size: number }) {
  if (fill === 'half') {
    return (
      <span className="relative inline-flex" aria-hidden>
        <Star size={size} strokeWidth={1.5} className="text-mute" />
        <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
          <Star size={size} strokeWidth={1.5} className="fill-ink text-ink" />
        </span>
      </span>
    );
  }
  return (
    <Star
      size={size}
      strokeWidth={1.5}
      aria-hidden
      className={fill === 'full' ? 'fill-ink text-ink' : 'text-mute'}
    />
  );
}

export default function RatingStars({
  workId,
  userId,
  readOnly = false,
  size = 20,
  showDetails = true,
  onRate,
  stats,
}: RatingStarsProps) {
  // List/grid views pass pre-aggregated `stats` (even null); those are used as
  // they are. Only a standalone widget loads its own.
  const provided = stats !== undefined;
  const [fetched, setFetched] = useState<RatingSnapshot>({ average: 0, count: 0, userRating: 0 });
  const [fetching, setFetching] = useState<boolean>(true);
  const avgRating = provided ? (stats?.average ?? 0) : fetched.average;
  const totalRatings = provided ? (stats?.count ?? 0) : fetched.count;
  const userRating = fetched.userRating;
  const loading = !provided && fetching;

  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  // After rating, an optional comment to go with it.
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [pendingRating, setPendingRating] = useState(0);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    if (provided) return;
    // `ignore` drops a stale answer if the work or viewer changes mid-request.
    let ignore = false;
    loadRatingStats(workId, userId).then((snapshot) => {
      if (ignore) return;
      if (snapshot) setFetched(snapshot);
      setFetching(false);
    });
    return () => {
      ignore = true;
    };
  }, [provided, workId, userId]);

  const handleRate = async (ratingValue: number) => {
    if (readOnly || !userId || submitting) return;

    setSubmitting(true);
    setRateError(null);
    try {
      const res = await fetch(`/api/works/${workId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingValue }),
      });
      if (!res.ok) throw new Error(await res.text());

      setFetched((prev) => ({ ...prev, userRating: ratingValue }));
      const snapshot = await loadRatingStats(workId, userId);
      if (snapshot) setFetched(snapshot);

      setPendingRating(ratingValue);
      setShowCommentForm(true);
      onRate?.(ratingValue);
    } catch (err) {
      console.error('Error submitting rating:', err);
      setRateError('Rating gagal disimpan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (submittingComment) return;

    setSubmittingComment(true);
    setCommentError(null);
    try {
      if (commentText.trim()) {
        const res = await fetch(`/api/works/${workId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: commentText.trim() }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      setCommentText('');
      setShowCommentForm(false);
      onRate?.(pendingRating);
    } catch (err) {
      console.error('Error submitting comment from rating stars:', err);
      setCommentError('Komentar gagal dikirim. Coba lagi.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const fillFor = (i: number, value: number): 'full' | 'half' | 'empty' =>
    value >= i ? 'full' : value >= i - 0.5 ? 'half' : 'empty';

  if (loading && showDetails) {
    return <div className="h-11 w-48 animate-pulse bg-sheet" aria-busy="true" aria-label="Memuat rating" />;
  }

  // Compact read-only figure for grids: ★ 4.5 (12)
  if (readOnly && !showDetails) {
    if (totalRatings === 0) return null;
    return (
      <span className="inline-flex items-center gap-1 font-sans text-[11px] font-bold tabular-nums text-ink">
        <Star size={11} className="fill-ink text-ink" aria-hidden />
        <span>{avgRating}</span>
        <span className="font-normal text-mute">({totalRatings})</span>
      </span>
    );
  }

  const summary =
    totalRatings > 0 ? (
      <span className="font-sans text-sm tabular-nums">
        <b>{avgRating}</b> <span className="text-mute">dari 5 · {totalRatings} rating</span>
      </span>
    ) : (
      <span className="font-sans text-sm text-mute">Belum ada rating</span>
    );

  if (readOnly) {
    const value = Math.round(avgRating * 2) / 2;
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1" role="img" aria-label={`Rata-rata ${avgRating} dari 5 bintang`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <StarIcon key={i} fill={fillFor(i, value)} size={size} />
          ))}
        </span>
        {showDetails && summary}
      </div>
    );
  }

  const shown = hoverRating ?? (userRating || avgRating);

  return (
    <div className="grid gap-2 font-sans">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div role="radiogroup" aria-label="Beri rating" className="-ml-2.5 flex items-center" onMouseLeave={() => setHoverRating(null)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={userRating === i}
              aria-label={`${i} bintang`}
              disabled={submitting}
              onClick={() => handleRate(i)}
              onMouseEnter={() => setHoverRating(i)}
              className={cx(
                'flex h-11 w-11 items-center justify-center transition-transform hover:scale-110 disabled:opacity-50',
                focusRing
              )}
            >
              <StarIcon fill={fillFor(i, shown)} size={size} />
            </button>
          ))}
        </div>
        {showDetails && summary}
      </div>

      {showDetails && (
        <p className="text-xs text-mute">
          {userRating > 0 ? `Rating Anda: ${userRating} bintang. Ketuk bintang lain untuk mengubah.` : 'Ketuk bintang untuk memberi rating.'}
        </p>
      )}
      {rateError && <p className="text-xs text-accent-text">{rateError}</p>}

      {showCommentForm && (
        <div className="mt-2 grid gap-3 border border-ink p-4">
          <TextAreaField
            id={`rating-comment-${workId}`}
            label={`Ceritakan rating ${pendingRating} bintang Anda`}
            rows={2}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value.slice(0, COMMENT_MAX))}
            placeholder="Opsional"
            hint={`${commentText.length} / ${COMMENT_MAX}`}
            error={commentError}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCommentText('');
                setShowCommentForm(false);
              }}
            >
              Lewati
            </Button>
            <Button size="sm" onClick={handleSubmitComment} loading={submittingComment}>
              Kirim
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
