'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Star, StarHalf, Loader2 } from 'lucide-react';

interface RatingStarsProps {
  workId: string;
  userId?: string;
  readOnly?: boolean;
  size?: number;
  showDetails?: boolean;
  onRate?: (rating: number) => void;
}

export default function RatingStars({
  workId,
  userId,
  readOnly = false,
  size = 20,
  showDetails = true,
  onRate,
}: RatingStarsProps) {
  const [avgRating, setAvgRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // States for inline comment box
  const [showCommentForm, setShowCommentForm] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>('');
  const [pendingRating, setPendingRating] = useState<number>(0);
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);

  const fetchRatingStats = useCallback(async () => {
    try {
      // Fetch all ratings for this work
      const { data, error } = await supabase
        .from('work_ratings')
        .select('rating, user_id')
        .eq('work_id', workId);

      if (error) throw error;

      if (data && data.length > 0) {
        const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
        setAvgRating(Number((sum / data.length).toFixed(1)));
        setTotalRatings(data.length);

        if (userId) {
          const userVote = data.find((r) => r.user_id === userId);
          if (userVote) {
            setUserRating(userVote.rating);
          } else {
            setUserRating(0);
          }
        }
      } else {
        setAvgRating(0);
        setTotalRatings(0);
        setUserRating(0);
      }
    } catch (err) {
      console.error('Error fetching rating stats:', err);
    } finally {
      setLoading(false);
    }
  }, [workId, userId]);

  useEffect(() => {
    fetchRatingStats();
  }, [fetchRatingStats]);

  const handleRate = async (ratingValue: number) => {
    if (readOnly || !userId || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/works/${workId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingValue }),
      });
      if (!res.ok) throw new Error(await res.text());

      setUserRating(ratingValue);
      // Refresh statistics
      await fetchRatingStats();

      // Show comment drawer inline with pending details
      setPendingRating(ratingValue);
      setShowCommentForm(true);

      if (onRate) {
        onRate(ratingValue);
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (submittingComment) return;

    setSubmittingComment(true);
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

      if (onRate) {
        onRate(pendingRating);
      }
    } catch (err) {
      console.error('Error submitting comment from rating stars:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCancelComment = () => {
    setCommentText('');
    setShowCommentForm(false);
  };

  if (loading && showDetails) {
    return (
      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-sans text-xs">
        <Loader2 className="animate-spin" size={14} />
        <span>Memuat rating...</span>
      </div>
    );
  }

  // Helper to render stars
  const renderStars = () => {
    const stars = [];
    const activeRating = hoverRating !== null ? hoverRating : (readOnly ? avgRating : userRating || avgRating);

    for (let i = 1; i <= 5; i++) {
      const isFull = activeRating >= i;
      const isHalf = !isFull && activeRating >= i - 0.5;

      stars.push(
        <button
          key={i}
          type="button"
          disabled={readOnly || submitting}
          onClick={() => handleRate(i)}
          onMouseEnter={() => !readOnly && setHoverRating(i)}
          onMouseLeave={() => !readOnly && setHoverRating(null)}
          className={`transition-all duration-150 relative ${
            readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'
          } ${submitting ? 'opacity-50' : ''}`}
          style={{ width: size, height: size }}
        >
          {isFull ? (
            <Star
              size={size}
              className="text-amber-400 fill-amber-400 drop-shadow-[0_0_2px_rgba(251,191,36,0.3)]"
            />
          ) : isHalf ? (
            <div className="relative">
              <Star size={size} className="text-slate-300 dark:text-slate-700" />
              <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '50%' }}>
                <Star size={size} className="text-amber-400 fill-amber-400" />
              </div>
            </div>
          ) : (
            <Star size={size} className="text-slate-300 dark:text-slate-700 hover:text-amber-300" />
          )}
        </button>
      );
    }
    return stars;
  };

  if (readOnly && !showDetails) {
    // Super compact read-only view (e.g. for feed card or gallery grid card)
    if (totalRatings === 0) return null;
    return (
      <div className="inline-flex items-center gap-1 text-[11px] font-sans font-bold text-amber-500 bg-amber-500/5 dark:bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-500/10">
        <Star size={11} className="fill-amber-500 text-amber-500" />
        <span>{avgRating}</span>
        <span className="text-slate-400 dark:text-slate-500 font-normal">({totalRatings})</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 font-sans">
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-0.5">{renderStars()}</div>
        {showDetails && totalRatings > 0 && (
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {avgRating} <span className="text-slate-400 dark:text-slate-500 font-normal">({totalRatings} rating)</span>
          </span>
        )}
        {showDetails && totalRatings === 0 && (
          <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Belum ada rating</span>
        )}
      </div>

      {!readOnly && userId && showDetails && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          {userRating > 0 ? `Rating Anda: ${userRating} bintang` : 'Klik bintang untuk memberi rating'}
        </p>
      )}

      {/* Inline Review/Comment box inside borders */}
      {!readOnly && showCommentForm && (
        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 border border-violet-500/30 rounded-xl space-y-2.5 animate-fade-in-up">
          <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400">
            Tulis Komentar untuk Rating {pendingRating}★ Anda:
          </p>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value.slice(0, 500))}
            placeholder="Bagikan pendapat Anda tentang karya ini (opsional)..."
            rows={2}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-violet-500 text-slate-800 dark:text-slate-200 resize-none"
          />
          <div className="flex justify-between items-center text-[9px] text-slate-400">
            <span>{commentText.length} / 500</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelComment}
                className="px-2 py-1 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitComment}
                disabled={submittingComment}
                className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-md flex items-center gap-1 transition-colors"
              >
                {submittingComment && <Loader2 size={10} className="animate-spin" />}
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
