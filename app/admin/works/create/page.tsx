'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { isAdmin } from '../../../lib/adminUtils';
import { supabase } from '../../../lib/supabaseClient';
import Navbar from '../../../component/Navbar';
// supabase (anon-key client) is only used here for the signed-URL Storage upload step —
// the upload token itself authorizes the write, no session needed.
import { LoadingSpinner } from '../../../component/LoadingStates';
import { useToast } from '../../../context/ToastContext';
import { ChevronLeft, Upload, X } from 'lucide-react';

const CATEGORIES = ['Paintings', 'Digital Art', 'Sculptures'];
const MAX_IMAGES = 6;

interface ImageUpload {
  file: File | null;
  preview: string | null;
  order: number;
  isFeatured: boolean;
}

const inputClass =
  'w-full px-4 py-3.5 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/10 transition-all font-sans text-sm';
const labelClass = 'block font-sans text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2.5';
const cardClass = 'bg-white/80 dark:bg-zinc-950/60 border border-black/5 dark:border-white/10 rounded-2xl p-8 space-y-6 transition-colors shadow-sm backdrop-blur-sm';

export default function CreateWork() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Paintings');
  const [images, setImages] = useState<ImageUpload[]>(
    Array.from({ length: MAX_IMAGES }, (_, i) => ({
      file: null,
      preview: null,
      order: i + 1,
      isFeatured: i === 0,
    }))
  );
  const [isPublished, setIsPublished] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  if (loading || !user || !isAdmin(user.email)) {
    return <LoadingSpinner />;
  }

  const handleImageSelect = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImages = [...images];
      newImages[index] = {
        ...newImages[index],
        file,
        preview: e.target?.result as string,
      };
      setImages(newImages);
    };
    reader.readAsDataURL(file);
  };

  const handleImageRemove = (index: number) => {
    const newImages = [...images];
    newImages[index] = {
      ...newImages[index],
      file: null,
      preview: null,
    };
    setImages(newImages);
  };

  const handleSetFeatured = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isFeatured: i === index,
    }));
    setImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validasi
      if (!title.trim()) {
        showToast({ type: 'error', message: 'Title is required' });
        setIsSubmitting(false);
        return;
      }

      const uploadedImages = images.filter((img) => img.file);
      if (uploadedImages.length === 0) {
        showToast({ type: 'error', message: 'Please upload at least 1 image' });
        setIsSubmitting(false);
        return;
      }

      // 1. Buat work di database (tanpa gambar dulu)
      const createRes = await fetch('/api/admin/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          is_published: isPublished,
        }),
      });
      const createData = await createRes.json();

      if (!createRes.ok) {
        console.error('Work creation error:', createData.error);
        showToast({ type: 'error', message: 'Failed to create work' });
        setIsSubmitting(false);
        return;
      }

      const workId = createData.work.id as string;

      // 2. Upload tiap gambar via signed URL, lalu persist row-nya
      for (const [index, imageData] of images.entries()) {
        if (!imageData.file) continue;

        const urlRes = await fetch(`/api/admin/works/${workId}/images/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: imageData.file.name }),
        });
        const urlData = await urlRes.json();

        if (!urlRes.ok) {
          console.error('Upload URL error:', urlData.error);
          showToast({ type: 'error', message: `Failed to upload image ${index + 1}` });
          setIsSubmitting(false);
          return;
        }

        const { error: uploadError } = await supabase.storage
          .from('work-images')
          .uploadToSignedUrl(urlData.path, urlData.token, imageData.file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          showToast({ type: 'error', message: `Failed to upload image ${index + 1}` });
          setIsSubmitting(false);
          return;
        }

        const persistRes = await fetch(`/api/admin/works/${workId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: urlData.publicUrl,
            display_order: imageData.order,
            is_featured: imageData.isFeatured,
          }),
        });

        if (!persistRes.ok) {
          console.error('Images insertion error:', await persistRes.text());
          showToast({ type: 'error', message: 'Failed to save images' });
          setIsSubmitting(false);
          return;
        }
      }

      showToast({ type: 'success', message: 'Work created successfully!' });
      router.push('/admin/works');
    } catch (error) {
      console.error('Error:', error);
      showToast({ type: 'error', message: 'An error occurred' });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar onOpenModal={() => {}} />

      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-6 md:p-20 transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/admin/works')}
            className="flex items-center gap-2 mb-8 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-sans text-sm font-medium">Back to Works</span>
          </button>

          {/* Header */}
          <div className="mb-12">
            <h1 className="font-serif text-5xl md:text-6xl italic font-medium mb-2">
              Upload New Work
            </h1>
            <p className="font-sans text-sm text-black/60 dark:text-white/60">
              Create an album with up to {MAX_IMAGES} images
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className={cardClass}>
              <h2 className="font-serif text-lg italic">Work Information</h2>

              <div>
                <label className={labelClass}>Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter work title"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter work description (optional)"
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputClass}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={isPublished ? 'published' : 'unpublished'}
                    onChange={(e) => setIsPublished(e.target.value === 'published')}
                    className={inputClass}
                  >
                    <option value="published">Published</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Images Upload */}
            <div className={cardClass}>
              <h2 className="font-serif text-lg italic">
                Images (Up to {MAX_IMAGES})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {images.map((image, index) => (
                  <div key={index} className="border-2 border-dashed border-black/10 dark:border-white/15 rounded-xl p-4 hover:border-violet-500/30 transition-colors">
                    <div className="relative">
                      {image.preview ? (
                        <div className="space-y-3">
                          <img
                            src={image.preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleImageRemove(index)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-lg hover:bg-rose-500/20 transition-colors font-sans text-xs font-bold"
                            >
                              <X size={14} />
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetFeatured(index)}
                              className={`flex-1 px-3 py-2 rounded-lg transition-colors font-sans text-xs font-bold ${
                                image.isFeatured
                                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300/60 dark:border-amber-800/50'
                                  : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
                              }`}
                            >
                              {image.isFeatured ? '★ Featured' : 'Set Featured'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="block cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageSelect(index, file);
                            }}
                            className="hidden"
                          />
                          <div className="flex flex-col items-center justify-center py-8">
                            <Upload size={26} strokeWidth={1.5} className="text-black/30 dark:text-white/30 mb-2" />
                            <p className="font-sans text-xs font-bold text-black/60 dark:text-white/60">Image {index + 1}</p>
                            <p className="font-sans text-[10px] text-black/40 dark:text-white/40 mt-0.5">Click to upload</p>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans text-[11px] font-black uppercase tracking-[0.2em]"
              >
                {isSubmitting ? 'Uploading...' : 'Create Work'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/works')}
                className="flex-1 px-6 py-3.5 border border-black/10 dark:border-white/10 text-black dark:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all font-sans text-[11px] font-black uppercase tracking-[0.2em]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
