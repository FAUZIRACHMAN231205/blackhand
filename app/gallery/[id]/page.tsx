'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import Navbar from '../../component/Navbar';
import AuthModal from '../../component/AuthModal';
import { LoadingSpinner } from '../../component/LoadingStates';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import RatingStars from '../../component/RatingStars';
import CommentSection from '../../component/CommentSection';
import { isAdmin as checkAdmin } from '../../lib/adminUtils';
import type { Work, WorkImage } from '../../types';

export default function GalleryDetail() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const workId = params.id as string;

  const [work, setWork] = useState<Work | null>(null);
  const [images, setImages] = useState<WorkImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadingWork, setLoadingWork] = useState(true);
  const [ratingsVersion, setRatingsVersion] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

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
        router.push('/gallery');
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
    // Public page: the work loads regardless of auth state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWorkDetail();
  }, [workId]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (loading || loadingWork) {
    return <LoadingSpinner />;
  }

  if (!work || images.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className="text-center">
          <p className="font-sans text-sm text-black/60 dark:text-white/60 mb-4">Work not found</p>
          <button
            onClick={() => router.push('/gallery')}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-all font-sans text-[11px] font-black uppercase tracking-[0.2em]"
          >
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  const currentImage = images[currentImageIndex];
  const isLongDescription = (work.description?.length ?? 0) > 280;

  return (
    <>
      <Navbar onOpenModal={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-20 px-4 md:px-6 pb-16 transition-colors duration-300">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/gallery')}
            className="flex items-center gap-2 py-2 mb-2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-sans text-sm font-medium">Back to Gallery</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
            {/* Main Image */}
            <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1">
              <div className="relative bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden mb-3 flex items-center justify-center h-[60vh] md:h-[500px]">
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
                          <Star size={14} className="text-amber-400 fill-current" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

            </div>

            {/* Info Panel — right column on desktop, directly under the image on mobile */}
            <div className="lg:col-span-1 lg:col-start-3 lg:row-start-1">
              <div className="bg-white/80 dark:bg-zinc-950/60 border border-black/5 dark:border-white/10 rounded-2xl p-6 space-y-5 sticky top-20 shadow-sm backdrop-blur-sm transition-colors">
                <div>
                  <h1 className="font-serif text-2xl italic mb-3 text-black dark:text-white">
                    {work.title}
                  </h1>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-full font-sans text-[10px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                      {work.category}
                    </span>
                    {images[currentImageIndex].is_featured && (
                      <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-800/40 rounded-full font-sans text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        <Star size={11} className="inline -mt-0.5 mr-1 fill-current" />Featured
                      </span>
                    )}
                  </div>

                  {/* Rating Stars Section */}
                  <div className="pt-4 border-t border-black/5 dark:border-white/10">
                    <RatingStars
                      workId={workId}
                      userId={user?.id}
                      readOnly={!user}
                      onRate={() => setRatingsVersion((prev) => prev + 1)}
                    />
                    {!user && (
                      <button
                        onClick={() => setAuthOpen(true)}
                        className="mt-2 font-sans text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                      >
                        Masuk untuk memberi rating
                      </button>
                    )}
                  </div>
                </div>

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
                  onClick={() => router.push('/gallery')}
                  className="w-full px-3 py-3 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-sans text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  View All Works
                </button>
              </div>
            </div>

            {/* Description */}
            {work.description && (
              <div className="lg:col-span-2 lg:col-start-1 border-t border-black/10 dark:border-white/10 pt-6">
                <h3 className="font-sans text-[10px] font-bold text-black/50 dark:text-white/50 mb-4 uppercase tracking-[0.2em]">
                  About the Artwork
                </h3>
                <p
                  className={`font-augustus uppercase text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed tracking-wide whitespace-pre-wrap ${
                    !descExpanded && isLongDescription ? 'line-clamp-6' : ''
                  }`}
                >
                  {work.description}
                </p>
                {isLongDescription && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-3 font-sans text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                  >
                    {descExpanded ? 'Ringkas' : 'Selengkapnya'}
                  </button>
                )}
              </div>
            )}

            {/* Comments */}
            <div className="lg:col-span-2 lg:col-start-1 pt-8 border-t border-black/10 dark:border-white/10">
              <CommentSection
                workId={workId}
                userId={user?.id}
                userEmail={user?.email || ''}
                isAdmin={user ? checkAdmin(user) : false}
                ratingsVersion={ratingsVersion}
                onRequireAuth={() => setAuthOpen(true)}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
