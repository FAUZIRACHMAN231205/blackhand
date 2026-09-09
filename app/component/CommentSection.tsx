'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MessageSquare, Send, Trash2, Loader2, AlertCircle } from 'lucide-react';
import type { WorkComment } from '../types';

interface CommentSectionProps {
  workId: string;
  userId: string;
  userEmail?: string;
  isAdmin?: boolean;
  ratingsVersion?: number;
}

// ─── Relative Timestamp Helper ────────────────────────────────────────
function commentTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days}h lalu`;
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CommentSection({
  workId,
  userId,
  userEmail,
  isAdmin = false,
  ratingsVersion = 0,
}: CommentSectionProps) {
  const [comments, setComments] = useState<WorkComment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commenterRatings, setCommenterRatings] = useState<Record<string, number>>({});

  const fetchCommenterRatings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('work_ratings')
        .select('user_id, rating')
        .eq('work_id', workId);
      
      if (!error && data) {
        const ratingMap: Record<string, number> = {};
        data.forEach((r) => {
          ratingMap[r.user_id] = r.rating;
        });
        setCommenterRatings(ratingMap);
      }
    } catch (err) {
      console.error('Error fetching commenter ratings:', err);
    }
  }, [workId]);

  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('work_comments')
        .select('*')
        .eq('work_id', workId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Gagal memuat komentar.');
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    fetchCommenterRatings();
    fetchComments();
  }, [fetchCommenterRatings, fetchComments, ratingsVersion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/works/${workId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to add comment');

      // Update local comments list
      setComments((prev) => [data.comment, ...prev]);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Gagal mengirim komentar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (deletingId) return;

    setDeletingId(commentId);
    setError(null);

    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());

      // Update local comments list
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Gagal menghapus komentar.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Section Title */}
      <div className="flex items-center gap-2 border-b border-black/10 dark:border-white/10 pb-3">
        <MessageSquare className="text-violet-500" size={18} />
        <h3 className="text-sm font-bold text-black/70 dark:text-white/70 uppercase tracking-wider">
          Diskusi & Komentar ({comments.length})
        </h3>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs border border-rose-100 dark:border-rose-900/30">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative bg-slate-50 dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-xl overflow-hidden focus-within:border-violet-500/50 transition-colors">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
            placeholder="Tulis pendapat atau komentar Anda tentang karya ini..."
            rows={3}
            disabled={submitting}
            className="w-full bg-transparent px-4 py-3 text-sm resize-none focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 text-slate-800 dark:text-slate-200"
          />
          <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 border-t border-black/5 dark:border-white/5 px-4 py-2 text-[10px]">
            <span className={newComment.length >= 480 ? 'text-rose-500 font-bold' : 'text-slate-400'}>
              {newComment.length} / 500 karakter
            </span>
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="flex items-center gap-1 px-3 py-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-[11px] font-bold rounded-lg transition-colors"
            >
              {submitting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              Kirim
            </button>
          </div>
        </div>
      </form>

      {/* Comment List */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-400 dark:text-slate-500 text-xs gap-2">
          <Loader2 className="animate-spin" size={14} />
          <span>Memuat komentar...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800/60 rounded-xl">
          <p className="text-xs text-slate-400 dark:text-slate-500">Belum ada diskusi. Jadilah yang pertama memberikan pendapat!</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {comments.map((comment) => {
            const isOwner = comment.user_id === userId;
            const canDelete = isOwner || isAdmin;
            const rating = commenterRatings[comment.user_id];

            return (
              <div
                key={comment.id}
                className="group flex gap-3 p-3.5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/40 rounded-xl hover:border-slate-200 dark:hover:border-slate-800/80 transition-colors"
              >
                {/* Avatar */}
                <div className="shrink-0">
                  {comment.user_avatar ? (
                    <img
                      src={comment.user_avatar}
                      alt={comment.user_name || 'User'}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 text-xs font-bold font-sans">
                      {(comment.user_name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Comment Body */}
                <div className="flex-grow space-y-1">
                  <div className="flex justify-between items-baseline gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {comment.user_name || 'Anonim'}
                      </span>
                      {rating && (
                        <div className="flex items-center gap-0.5 text-amber-500 dark:text-amber-400 select-none" title={`Rating: ${rating}/5`}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="text-[10px] leading-none">
                              {i < rating ? '★' : '☆'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                      {commentTimeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm font-light text-slate-600 dark:text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>

                {/* Delete Button */}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    title="Hapus komentar"
                    className="shrink-0 text-slate-400 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-colors self-start opacity-0 group-hover:opacity-100 focus:opacity-100 p-1"
                  >
                    {deletingId === comment.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
