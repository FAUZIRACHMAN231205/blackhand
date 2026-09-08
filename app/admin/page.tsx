'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { isAdmin } from '../lib/adminUtils';
import Navbar from '../component/Navbar';
import { LoadingSpinner } from '../component/LoadingStates';
import { Plus, Edit2, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ totalWorks: 0, totalImages: 0, featuredWorks: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    // Redirect jika belum login atau bukan admin
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (!isAdmin(user)) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats({
        totalWorks: data.totalWorks ?? 0,
        totalImages: data.totalImages ?? 0,
        featuredWorks: data.featuredWorks ?? 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin(user)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchStats();
    }
  }, [user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || !isAdmin(user)) {
    return null;
  }

  const statCards = [
    { label: 'Total Works', value: stats.totalWorks, sub: 'Artworks published' },
    { label: 'Total Images', value: stats.totalImages, sub: 'Across all works' },
    { label: 'Featured Works', value: stats.featuredWorks, sub: 'Showcased artworks' },
  ];

  return (
    <>
      <Navbar onOpenModal={() => {}} />

      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-6 md:p-20 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-12">
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl italic font-medium mb-2">
              Admin Panel
            </h1>
            <p className="font-sans text-sm text-black/60 dark:text-white/60">
              Welcome, <span className="text-black/80 dark:text-white/80">{user.email}</span>
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {statCards.map((stat) => (
              <div
                key={stat.label}
                className="bg-white/80 dark:bg-zinc-950/60 border border-black/5 dark:border-white/10 rounded-2xl p-6 shadow-sm backdrop-blur-sm transition-colors"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-500/10 text-violet-500 dark:text-violet-400">
                    <BarChart3 size={18} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                    {stat.label}
                  </h3>
                </div>
                <p className="font-serif text-4xl italic text-black dark:text-white">
                  {loadingStats ? '···' : stat.value}
                </p>
                <p className="font-sans text-xs text-black/50 dark:text-white/50 mt-2">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Main Actions */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl italic mb-6 text-black/80 dark:text-white/80">Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Work */}
              <Link href="/admin/works/create" className="group">
                <div className="bg-white/80 dark:bg-zinc-950/60 border border-black/5 dark:border-white/10 rounded-2xl p-8 hover:border-violet-500/30 dark:hover:border-violet-500/30 transition-all hover:shadow-lg cursor-pointer backdrop-blur-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-500 dark:text-violet-400">
                      <Plus size={22} strokeWidth={1.5} />
                    </div>
                    <h3 className="font-serif text-xl italic">Upload New Work</h3>
                  </div>
                  <p className="font-sans text-sm text-black/60 dark:text-white/60">Create a new album with up to 6 images</p>
                </div>
              </Link>

              {/* Manage Works */}
              <Link href="/admin/works" className="group">
                <div className="bg-white/80 dark:bg-zinc-950/60 border border-black/5 dark:border-white/10 rounded-2xl p-8 hover:border-violet-500/30 dark:hover:border-violet-500/30 transition-all hover:shadow-lg cursor-pointer backdrop-blur-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-500 dark:text-violet-400">
                      <Edit2 size={20} strokeWidth={1.5} />
                    </div>
                    <h3 className="font-serif text-xl italic">Manage Works</h3>
                  </div>
                  <p className="font-sans text-sm text-black/60 dark:text-white/60">View, edit, or delete existing artworks</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Information Section */}
          <div className="bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 rounded-2xl p-8">
            <h3 className="font-serif text-lg italic mb-4">Admin Information</h3>
            <ul className="space-y-3 font-sans text-sm text-black/70 dark:text-white/70">
              <li>&bull; Each work is an album containing up to 6 images</li>
              <li>&bull; You can set one image as featured/showcase</li>
              <li>&bull; Works are published by default but can be unpublished</li>
              <li>&bull; All your works will be visible to logged-in users in the gallery</li>
              <li>&bull; Use Supabase storage for image uploads (max 5MB per image)</li>
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
