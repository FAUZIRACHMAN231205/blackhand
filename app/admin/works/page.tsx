'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../lib/adminUtils';
import Navbar from '../../component/Navbar';
import { LoadingSpinner } from '../../component/LoadingStates';
import ConfirmDialog from '../../component/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface Work {
  id: string;
  title: string;
  category: string;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
}

export default function AdminWorks() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [works, setWorks] = useState<Work[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Work | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Redirect jika belum login atau bukan admin
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (!isAdmin(user.email)) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  const fetchWorks = async () => {
    try {
      const res = await fetch('/api/admin/works');
      if (!res.ok) {
        console.error('Error fetching works:', await res.text());
        return;
      }
      const data = await res.json();
      setWorks(data.works || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingWorks(false);
    }
  };

  useEffect(() => {
    // Fetch works dari database
    if (user && isAdmin(user.email)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchWorks();
    }
  }, [user]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/works/${pendingDelete.id}`, { method: 'DELETE' });

      if (!res.ok) {
        console.error('Error deleting work:', await res.text());
        showToast({ type: 'error', message: 'Failed to delete work' });
        return;
      }

      setWorks((prev) => prev.filter((w) => w.id !== pendingDelete.id));
      showToast({ type: 'success', message: 'Work deleted successfully' });
    } catch (error) {
      console.error('Error:', error);
      showToast({ type: 'error', message: 'Error deleting work' });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || !isAdmin(user.email)) {
    return null;
  }

  return (
    <>
      <Navbar onOpenModal={() => {}} />

      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-6 md:p-20 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 mb-8 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-sans text-sm font-medium">Back to Admin</span>
          </button>

          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="font-serif text-5xl md:text-6xl italic font-medium mb-2">
                Manage Works
              </h1>
              <p className="font-sans text-sm text-black/60 dark:text-white/60">
                Total: <span className="text-black dark:text-white font-medium">{works.length}</span> artworks
              </p>
            </div>
            <Link
              href="/admin/works/create"
              className="flex items-center gap-2 px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-all font-sans text-[11px] font-black uppercase tracking-[0.2em]"
            >
              <Plus size={16} />
              <span>New Work</span>
            </Link>
          </div>

          {/* Works List */}
          {loadingWorks ? (
            <div className="text-center py-16">
              <p className="font-sans text-sm text-black/50 dark:text-white/50 animate-pulse">Loading works...</p>
            </div>
          ) : works.length === 0 ? (
            <div className="bg-white/80 dark:bg-zinc-950/60 border border-dashed border-black/10 dark:border-white/15 rounded-2xl p-12 text-center transition-colors">
              <div className="mb-4">
                <div className="w-16 h-16 bg-violet-500/10 rounded-full mx-auto flex items-center justify-center">
                  <span className="text-2xl">🎨</span>
                </div>
              </div>
              <h2 className="font-serif text-2xl italic mb-2">No Works Yet</h2>
              <p className="font-sans text-sm text-black/60 dark:text-white/60 mb-6">Create your first work to showcase your art</p>
              <Link
                href="/admin/works/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-all font-sans text-[11px] font-black uppercase tracking-[0.2em]"
              >
                <Plus size={14} />
                <span>Create First Work</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {works.map((work) => (
                <div
                  key={work.id}
                  className="bg-white/80 dark:bg-zinc-950/60 border border-black/5 dark:border-white/10 rounded-2xl p-6 hover:border-violet-500/30 dark:hover:border-violet-500/30 transition-all shadow-sm backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="font-serif text-lg italic truncate">{work.title}</h3>
                        {work.is_featured && (
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-800/40 rounded-full font-sans text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Featured
                          </span>
                        )}
                        {!work.is_published && (
                          <span className="px-2 py-0.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full font-sans text-[9px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                            Unpublished
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 font-sans text-xs text-black/50 dark:text-white/50">
                        <span>{work.category}</span>
                        <span>{new Date(work.created_at).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/admin/works/${work.id}/edit`}
                        className="p-2.5 hover:bg-violet-500/10 rounded-xl transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} strokeWidth={1.5} className="text-black/60 dark:text-white/60 hover:text-violet-500 dark:hover:text-violet-400" />
                      </Link>
                      <button
                        onClick={() => setPendingDelete(work)}
                        className="p-2.5 hover:bg-rose-500/10 rounded-xl transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} strokeWidth={1.5} className="text-rose-500/80 dark:text-rose-400/80 hover:text-rose-600 dark:hover:text-rose-300" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete work?"
        message={pendingDelete ? `"${pendingDelete.title}" and all its images will be permanently removed. This cannot be undone.` : ''}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
