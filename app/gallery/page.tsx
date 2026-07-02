'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../component/Navbar';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import RatingStars from '../component/RatingStars';
import { LoadingSpinner, SkeletonGrid } from '../component/LoadingStates';
import type { Work } from '../types';

export default function Gallery() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const CATEGORIES = ['Paintings', 'Digital Art', 'Sculptures'];

  useEffect(() => {
    // Redirect ke home jika belum login
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const fetchWorks = async () => {
    try {
      const { data, error } = await supabase
        .from('works')
        .select('id, title, description, category, featured_image_url, is_featured, is_published, created_at')
        .eq('is_published', true)
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
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchWorks();
    }
  }, [user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  const filteredWorks = selectedCategory
    ? works.filter(work => work.category === selectedCategory)
    : works;

  const featuredWorks = works.filter(w => w.is_featured);

  return (
    <>
      <Navbar onOpenModal={() => {}} />
      
      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-6 md:p-20 transition-colors">
        <div className="max-w-7xl mx-auto">
          {/* Back to Dashboard Button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 mb-8 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-sans text-sm font-medium">Back to Dashboard</span>
          </button>

          {/* Header Section */}
          <div className="mb-12">
            <h1 className="text-5xl md:text-6xl font-cormorant font-medium mb-2">
              Gallery
            </h1>
            <p className="text-black/60 dark:text-white/60 text-lg">
              Explore my artistic portfolio and creative projects
            </p>
          </div>

          {/* Featured Showcase */}
          {featuredWorks.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-cormorant font-medium mb-6 text-black/80 dark:text-white/80">Featured</h2>
              <div className="grid grid-cols-1 gap-6">
                {featuredWorks.map((work) => (
                  <Link key={work.id} href={`/gallery/${work.id}`} className="group">
                    <div className="relative overflow-hidden rounded-lg">
                      {work.featured_image_url && (
                        <img
                          src={work.featured_image_url}
                          alt={work.title}
                          className="w-full h-96 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-8">
                        <div className="text-white">
                          <span className="inline-block px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full mb-3">
                            ⭐ FEATURED
                          </span>
                          <h3 className="text-2xl font-cormorant font-medium">{work.title}</h3>
                          <p className="text-sm opacity-90 mt-1">{work.category}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Categories Filter */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-black/60 dark:text-white/60 mb-4">FILTER BY CATEGORY</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full transition-colors text-sm ${
                  selectedCategory === null
                    ? 'bg-black dark:bg-white text-white dark:text-black font-medium'
                    : 'bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full transition-colors text-sm ${
                    selectedCategory === cat
                      ? 'bg-black dark:bg-white text-white dark:text-black font-medium'
                      : 'bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Works Grid */}
          {loadingWorks ? (
            <SkeletonGrid count={6} />
          ) : filteredWorks.length === 0 ? (
            <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-12 text-center">
              <div className="mb-4">
                <span className="text-4xl">🎨</span>
              </div>
              <h2 className="text-2xl font-cormorant font-medium mb-2">No Works Found</h2>
              <p className="text-black/60 dark:text-white/60">
                {selectedCategory
                  ? `No artworks in ${selectedCategory} category yet`
                  : 'No artworks published yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorks.map((work) => (
                <Link key={work.id} href={`/gallery/${work.id}`} className="group">
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                      {work.featured_image_url ? (
                        <img
                          src={work.featured_image_url}
                          alt={work.title}
                          className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full aspect-square flex items-center justify-center bg-black/10 dark:bg-white/10">
                          <span className="text-4xl opacity-50">🎨</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-cormorant font-medium line-clamp-2 group-hover:text-black/70 dark:group-hover:text-white/70 transition-colors">
                        {work.title}
                      </h3>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-sm text-black/60 dark:text-white/60">{work.category}</p>
                        <RatingStars workId={work.id} readOnly showDetails={false} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="mt-16 pt-8 border-t border-black/10 dark:border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-3xl font-bold text-black dark:text-white">{works.length}</p>
                <p className="text-black/60 dark:text-white/60 text-sm mt-1">Total Works</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-black dark:text-white">{CATEGORIES.length}</p>
                <p className="text-black/60 dark:text-white/60 text-sm mt-1">Categories</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-black dark:text-white">{featuredWorks.length}</p>
                <p className="text-black/60 dark:text-white/60 text-sm mt-1">Featured Works</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
