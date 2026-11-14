'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { WorkComment } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { Button, Notice, TextAreaField } from './ui';

interface CommentSectionProps {
  workId: string;
  /** Omitted for signed-out visitors: comments stay readable, posting is gated. */
  userId?: string;
  isAdmin?: boolean;
  ratingsVersion?: number;
  /** Called when a signed-out visitor wants to comment. */
  onRequireAuth?: () => void;
}

const COMMENT_MAX = 500;

function commentTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Each commenter's own rating of this work, keyed by user id. */
async function loadCommenterRatings(workId: string): Promise<Record<string, number> | null> {
  try {
    const { data, error } = await supabase.from('work_ratings').select('user_id, rating').eq('work_id', workId);
    if (error || !data) return null;
    return Object.fromEntries(data.map((r) => [r.user_id, r.rating]));
  } catch (err) {
    console.error('Error fetching commenter ratings:', err);
    return null;
  }
}

/** Newest first. Throws so the caller can show an error. */
async function loadComments(workId: string): Promise<WorkComment[]> {
  const { data, error } = await supabase
    .from('work_comments')
    .select('*')
    .eq('work_id', workId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export default function CommentSection({
  workId,
  userId,
  isAdmin = false,
  ratingsVersion = 0,
  onRequireAuth,
}: CommentSectionProps) {
  const [comments, setComments] = useState<WorkComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WorkComment | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [commenterRatings, setCommenterRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    // Re-runs when the work changes or a new rating lands; `ignore` drops the
    // answer from a previous run so it can't overwrite a newer one.
    let ignore = false;

    loadCommenterRatings(workId).then((ratings) => {
      if (!ignore && ratings) setCommenterRatings(ratings);
    });

    loadComments(workId)
      .then((list) => {
        if (!ignore) {
          setComments(list);
          setLoadError(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching comments:', err);
        if (!ignore) setLoadError(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [workId, ratingsVersion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/works/${workId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add comment');

      setComments((prev) => [data.comment, ...prev]);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setActionError('Komentar gagal dikirim. Periksa koneksi Anda lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete || deletingId) return;
    const commentId = pendingDelete.id;

    setDeletingId(commentId);
    setActionError(null);
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      setActionError('Komentar gagal dihapus. Coba lagi.');
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  return (
    <section className="grid gap-6 font-sans" aria-labelledby={`comments-${workId}`}>
      <h2
        id={`comments-${workId}`}
        className="border-b border-ink pb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ink"
      >
        Diskusi{!loading && !loadError ? ` · ${comments.length}` : ''}
      </h2>

      {actionError && <Notice tone="error">{actionError}</Notice>}

      {userId ? (
        <form onSubmit={handleSubmit} className="grid gap-3">
          <TextAreaField
            id={`comment-${workId}`}
            label="Komentar Anda"
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value.slice(0, COMMENT_MAX))}
            placeholder="Tulis pendapat Anda tentang karya ini"
            disabled={submitting}
            hint={`${newComment.length} / ${COMMENT_MAX}`}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={submitting} disabled={!newComment.trim()}>
              Kirim komentar
            </Button>
          </div>
        </form>
      ) : (
        <Notice
          tone="pending"
          title="Ikut berdiskusi"
          action={
            <Button variant="secondary" size="sm" onClick={onRequireAuth}>
              Masuk
            </Button>
          }
        >
          Masuk untuk berkomentar dan memberi rating pada karya ini.
        </Notice>
      )}

      {loading ? (
        <div className="grid gap-3" aria-busy="true" aria-label="Memuat komentar">
          <div className="h-16 animate-pulse bg-sheet" />
          <div className="h-16 animate-pulse bg-sheet" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-accent-text">Komentar gagal dimuat. Muat ulang halaman untuk mencoba lagi.</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-mute">Belum ada diskusi. Jadilah yang pertama memberi pendapat.</p>
      ) : (
        <ul className="border-t border-line">
          {comments.map((comment) => {
            const canDelete = comment.user_id === userId || isAdmin;
            const rating = commenterRatings[comment.user_id];

            return (
              <li key={comment.id} className="flex gap-3 border-b border-line py-4">
                {comment.user_avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={comment.user_avatar}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 shrink-0 rounded-full border border-line object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-serif text-sm text-paper"
                  >
                    {(comment.user_name || 'A').charAt(0).toUpperCase()}
                  </span>
                )}

                <div className="grid min-w-0 flex-grow gap-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-bold text-ink">{comment.user_name || 'Anonim'}</span>
                    {rating && (
                      <span className="flex items-center gap-0.5" role="img" aria-label={`Rating ${rating} dari 5`}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={11}
                            aria-hidden
                            className={i < rating ? 'fill-ink text-ink' : 'text-mute'}
                          />
                        ))}
                      </span>
                    )}
                    <span className="text-xs text-mute">{commentTimeAgo(comment.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{comment.content}</p>
                  {canDelete && (
                    <div className="pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 text-mute"
                        onClick={() => setPendingDelete(comment)}
                        disabled={deletingId === comment.id}
                      >
                        Hapus
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Hapus komentar?"
        message="Komentar ini akan dihapus permanen dan tidak bisa dikembalikan."
        confirmLabel="Hapus"
        loading={deletingId !== null}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
