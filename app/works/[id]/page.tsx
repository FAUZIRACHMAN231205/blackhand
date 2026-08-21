'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import Navbar from '../../component/Navbar';
import { LoadingSpinner } from '../../component/LoadingStates';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Work {
  id: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
}

interface WorkImage {
  id: string;
  image_url: string;
  display_order: number;
  is_featured: boolean;
}

export default function WorkDetail() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const workId = params.id as string;

  const [work, setWork] = useState<Work | null>(null);
  const [images, setImages] = useState<WorkImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadingWork, setLoadingWork] = useState(true);

  useEffect(() => {
    // Redirect ke home jika belum login
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const fetchWorkDetail = async () => {
    try {
      // Fetch work
      const { data: workData, error: workError } = await supabase
        .from('works')
        .select('*')
        .eq('id', workId)
        .eq('is_published', true)
        .single();

      if (workError) {
        console.error('Error fetching work:', workError);
        router.push('/works');
        return;
      }

      setWork(workData);

      // Fetch images
      const { data: imagesData, error: imagesError } = await supabase
        .from('work_images')
        .select('*')
        .eq('work_id', workId)
        .order('display_order', { ascending: true });

      if (imagesError) {
        console.error('Error fetching images:', imagesError);
        return;
      }

      setImages(imagesData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingWork(false);
    }
  };

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchWorkDetail();
    }
  }, [user, workId]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (loading || loadingWork) {
    return <LoadingSpinner />;
  }

  if (!user || !work || images.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className="text-center">
          <p className="font-sans text-sm text-black/60 dark:text-white/60 mb-4">Work not found</p>
          <button
            onClick={() => router.push('/works')}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-all font-sans text-[11px] font-black uppercase tracking-[0.2em]"
          >
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  const currentImage = images[currentImageIndex];

  return (
    <>
      <Navbar onOpenModal={() => {}} />

      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-20 px-4 md:px-6 pb-16 transition-colors duration-300">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/works')}
            className="flex items-center gap-2 mb-3 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-sans text-sm font-medium">Back to Gallery</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Image */}
            <div className="lg:col-span-2">
              <div className="relative bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden mb-3 flex items-center justify-center" style={{ height: '500px' }}>
                <img
                  src={currentImage.image_url}
                  alt={work.title}
                  className="w-full h-full object-contain"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-zinc-950/80 hover:bg-zinc-950 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center transition-colors text-white"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={22} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-zinc-950/80 hover:bg-zinc-950 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center transition-colors text-white"
                      aria-label="Next image"
                    >
                      <ChevronRight size={22} strokeWidth={1.5} />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-zinc-950/80 backdrop-blur-md border border-white/10 text-white font-sans text-[10px] font-bold tracking-wider rounded-full">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail Grid */}
              {images.length > 1 && (
                <div className="grid grid-cols-6 gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        idx === currentImageIndex
                          ? 'border-violet-500'
                          : 'border-black/10 dark:border-white/10 hover:border-violet-500/40'
                      }`}
                    >
                      <img
                        src={img.image_url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {img.is_featured && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="text-amber-400 text-sm">★</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white/80 dark:bg-zinc-950/60 border border-black/5 dark:border-white/10 rounded-2xl p-6 space-y-5 sticky top-20 shadow-sm backdrop-blur-sm transition-colors">
                <div>
                  <h1 className="font-serif text-2xl italic mb-3 text-black dark:text-white">
                    {work.title}
                  </h1>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-full font-sans text-[10px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                      {work.category}
                    </span>
                    {images[currentImageIndex].is_featured && (
                      <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-800/40 rounded-full font-sans text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        ★ Featured
                      </span>
                    )}
                  </div>
                </div>

                {work.description && (
                  <div className="border-t border-black/5 dark:border-white/10 pt-4">
                    <h3 className="font-sans text-[10px] font-bold text-black/50 dark:text-white/50 mb-3 uppercase tracking-[0.2em]">Description</h3>
                    <p className="font-sans text-black/70 dark:text-white/70 leading-relaxed text-sm font-light">
                      {work.description}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="font-sans text-[10px] font-bold text-black/50 dark:text-white/50 mb-2.5 uppercase tracking-[0.2em]">Details</h3>
                  <div className="space-y-1.5 font-sans text-xs">
                    <div className="flex justify-between">
                      <span className="text-black/50 dark:text-white/50">Images</span>
                      <span className="font-medium text-black dark:text-white">{images.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50 dark:text-white/50">Created</span>
                      <span className="font-medium text-black dark:text-white">
                        {new Date(work.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50 dark:text-white/50">Current</span>
                      <span className="font-medium text-black dark:text-white">{currentImageIndex + 1} / {images.length}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/works')}
                  className="w-full px-3 py-3 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-sans text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  View All Works
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
