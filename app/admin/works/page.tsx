'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../lib/adminUtils';
import { supabase } from '../../lib/supabaseClient';
import Navbar from '../../component/Navbar';
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
  const [works, setWorks] = useState<Work[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);

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
      const { data, error } = await supabase
        .from('works')
        .select('id, title, category, is_published, is_featured, created_at')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching works:', error);
        return;
      }

      setWorks(data || []);
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

  const deleteWork = async (workId: string) => {
    if (!confirm('Are you sure you want to delete this work?')) return;

    try {
      const { error } = await supabase
        .from('works')
        .delete()
        .eq('id', workId);

      if (error) {
        console.error('Error deleting work:', error);
        alert('Failed to delete work');
        return;
      }

      setWorks(works.filter(w => w.id !== workId));
      alert('Work deleted successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting work');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 transition-colors">
        <div className="text-black dark:text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin(user.email)) {
    return null;
  }

  return (
    <>
      <Navbar onOpenModal={() => {}} />
      
      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-6 md:p-20 transition-colors">
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
              <h1 className="text-5xl md:text-6xl font-cormorant font-medium mb-2">
                Manage Works
              </h1>
              <p className="text-black/60 dark:text-white/60">
                Total: <span className="text-black dark:text-white font-medium">{works.length}</span> artworks
              </p>
            </div>
            <Link 
              href="/admin/works/create"
              className="flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-black/90 dark:hover:bg-white/90 transition-colors font-medium text-sm"
            >
              <Plus size={20} />
              <span>New Work</span>
            </Link>
          </div>

          {/* Works List */}
          {loadingWorks ? (
            <div className="text-center py-12">
              <p className="text-black/60 dark:text-white/60">Loading works...</p>
            </div>
          ) : works.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-lg p-12 text-center transition-colors">
              <div className="mb-4">
                <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-full mx-auto flex items-center justify-center">
                  <span className="text-2xl">🎨</span>
                </div>
              </div>
              <h2 className="text-2xl font-cormorant font-medium mb-2">No Works Yet</h2>
              <p className="text-black/60 dark:text-white/60 mb-6">Create your first work to showcase your art</p>
              <Link 
                href="/admin/works/create"
                className="inline-flex items-center gap-2 px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-black/90 dark:hover:bg-white/90 transition-colors"
              >
                <Plus size={16} />
                <span>Create First Work</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {works.map((work) => (
                <div 
                  key={work.id}
                  className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-lg p-6 hover:border-black/20 dark:hover:border-white/20 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-lg font-cormorant font-medium">{work.title}</h3>
                        {work.is_featured && (
                          <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-950/40 border border-yellow-300 dark:border-yellow-800/50 rounded-full text-xs font-bold text-yellow-800 dark:text-yellow-400">
                            FEATURED
                          </span>
                        )}
                        {!work.is_published && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-full text-xs font-bold text-gray-800 dark:text-white/70">
                            UNPUBLISHED
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm text-black/60 dark:text-white/60">
                        <span>{work.category}</span>
                        <span>{new Date(work.created_at).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/works/${work.id}/edit`}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} className="text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white" />
                      </Link>
                      <button
                        onClick={() => deleteWork(work.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
