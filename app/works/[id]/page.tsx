'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabaseClient';
import Navbar from '../../component/Navbar';
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

  useEffect(() => {
    if (user) {
      fetchWorkDetail();
    }
  }, [user, workId]);

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

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (loading || loadingWork) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !work || images.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <p className="text-black/60 dark:text-white/60 mb-4">Work not found</p>
          <button
            onClick={() => router.push('/works')}
            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-black/90 dark:hover:bg-white/90"
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
      
      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-20 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/works')}
            className="flex items-center gap-2 mb-3 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-sans text-sm font-medium">Back to Gallery</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Image */}
            <div className="lg:col-span-2">
              <div className="relative bg-black/5 dark:bg-white/5 rounded-lg overflow-hidden mb-3 flex items-center justify-center" style={{ height: '500px' }}>
                <img
                  src={currentImage.image_url}
                  alt={work.title}
                  className="w-full h-full object-contain"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 dark:bg-black/90 hover:bg-white dark:hover:bg-black rounded-full flex items-center justify-center transition-colors text-black dark:text-white"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 dark:bg-black/90 hover:bg-white dark:hover:bg-black rounded-full flex items-center justify-center transition-colors text-black dark:text-white"
                      aria-label="Next image"
                    >
                      <ChevronRight size={24} />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 dark:bg-white/60 text-white dark:text-black text-xs font-medium rounded-full">
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
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentImageIndex
                          ? 'border-black dark:border-white'
                          : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                      }`}
                    >
                      <img
                        src={img.image_url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {img.is_featured && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="text-white text-sm">⭐</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-lg p-5 space-y-3 sticky top-20">
                <div>
                  <h1 className="text-2xl font-cormorant font-medium mb-2 text-black dark:text-white">
                    {work.title}
                  </h1>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-full text-xs font-bold text-black/70 dark:text-white/70">
                      {work.category}
                    </span>
                    {images[currentImageIndex].is_featured && (
                      <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-full text-xs font-bold text-yellow-800 dark:text-yellow-400">
                        ⭐ FEATURED
                      </span>
                    )}
                  </div>
                </div>

                {work.description && (
                  <div className="border-t border-black/10 dark:border-white/10 pt-4">
                    <h3 className="text-sm font-bold text-black/70 dark:text-white/70 mb-3 uppercase tracking-wide">DESCRIPTION</h3>
                    <p className="text-black/70 dark:text-white/70 leading-relaxed text-sm font-light">
                      {work.description}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-bold text-black/60 dark:text-white/60 mb-1">DETAILS</h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-black/60 dark:text-white/60">Images</span>
                      <span className="font-medium text-black dark:text-white">{images.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/60 dark:text-white/60">Created</span>
                      <span className="font-medium text-black dark:text-white">
                        {new Date(work.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/60 dark:text-white/60">Current</span>
                      <span className="font-medium text-black dark:text-white">{currentImageIndex + 1} / {images.length}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/works')}
                  className="w-full px-3 py-1 border border-black/20 dark:border-white/20 text-black dark:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium text-xs"
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
