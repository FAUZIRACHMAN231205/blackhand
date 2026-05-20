'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabaseClient';
import Navbar from '../../../component/Navbar';
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-black/60 mb-4">Work not found</p>
          <button
            onClick={() => router.push('/works')}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-black/90"
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
      
      <main className="min-h-[100dvh] bg-white text-black pt-24 p-6 md:p-20">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/works')}
            className="flex items-center gap-2 mb-8 text-black/60 hover:text-black transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-sans text-sm font-medium">Back to Gallery</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Image */}
            <div className="lg:col-span-2">
              <div className="relative bg-black/5 rounded-lg overflow-hidden mb-6">
                <img
                  src={currentImage.image_url}
                  alt={work.title}
                  className="w-full aspect-square object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-colors"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-colors"
                      aria-label="Next image"
                    >
                      <ChevronRight size={24} />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 text-white text-xs font-medium rounded-full">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail Grid */}
              {images.length > 1 && (
                <div className="grid grid-cols-6 gap-3">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentImageIndex
                          ? 'border-black'
                          : 'border-black/10 hover:border-black/30'
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
              <div className="bg-white border border-black/10 rounded-lg p-8 space-y-6 sticky top-24">
                <div>
                  <h1 className="text-3xl font-cormorant font-medium mb-2">
                    {work.title}
                  </h1>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-black/5 border border-black/10 rounded-full text-xs font-bold text-black/70">
                      {work.category}
                    </span>
                    {images[currentImageIndex].is_featured && (
                      <span className="px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-full text-xs font-bold text-yellow-800">
                        ⭐ FEATURED
                      </span>
                    )}
                  </div>
                </div>

                {work.description && (
                  <div>
                    <h3 className="text-sm font-bold text-black/60 mb-2">DESCRIPTION</h3>
                    <p className="text-black/70 leading-relaxed text-sm">
                      {work.description}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-bold text-black/60 mb-2">DETAILS</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-black/60">Images</span>
                      <span className="font-medium">{images.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/60">Created</span>
                      <span className="font-medium">
                        {new Date(work.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/60">Current</span>
                      <span className="font-medium">{currentImageIndex + 1} / {images.length}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/works')}
                  className="w-full px-4 py-2 border border-black/20 text-black rounded-lg hover:bg-black/5 transition-colors font-medium"
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
