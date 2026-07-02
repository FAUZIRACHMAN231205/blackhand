'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { isAdmin } from '../../../lib/adminUtils';
import { supabase } from '../../../lib/supabaseClient';
import Navbar from '../../../component/Navbar';
import { ChevronLeft, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

const CATEGORIES = ['Paintings', 'Digital Art', 'Sculptures'];
const MAX_IMAGES = 6;

interface ImageUpload {
  file: File | null;
  preview: string | null;
  order: number;
  isFeatured: boolean;
}

export default function CreateWork() {
  const { user, loading } = useAuth();
  const router = useRouter();
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 transition-colors">
        <div className="text-black dark:text-white text-xl">Loading...</div>
      </div>
    );
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
        alert('Title is required');
        setIsSubmitting(false);
        return;
      }

      const uploadedImages = images.filter(img => img.file);
      if (uploadedImages.length === 0) {
        alert('Please upload at least 1 image');
        setIsSubmitting(false);
        return;
      }

      // Upload images ke Supabase Storage
      const uploadedImageUrls: { url: string; order: number; isFeatured: boolean }[] = [];

      for (const [index, imageData] of images.entries()) {
        if (!imageData.file) continue;

        const fileName = `${Date.now()}-${index}-${imageData.file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('work-images')
          .upload(`works/${Date.now()}/${fileName}`, imageData.file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          setErrorMessage(`Failed to upload image ${index + 1}`);
          setShowErrorModal(true);
          setIsSubmitting(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('work-images')
          .getPublicUrl(uploadData.path);

        uploadedImageUrls.push({
          url: urlData.publicUrl,
          order: imageData.order,
          isFeatured: imageData.isFeatured,
        });
      }

      // Buat work di database
      const featuredImage = uploadedImageUrls.find(img => img.isFeatured);
      const { data: workData, error: workError } = await supabase
        .from('works')
        .insert({
          title: title.trim(),
          description: description.trim(),
          category,
          created_by: user.id,
          is_published: isPublished,
          featured_image_url: featuredImage?.url || uploadedImageUrls[0]?.url,
        })
        .select('id')
        .single();

      if (workError) {
        console.error('Work creation error:', workError);
        setErrorMessage('Failed to create work');
        setShowErrorModal(true);
        setIsSubmitting(false);
        return;
      }

      // Insert work_images
      const imagesToInsert = uploadedImageUrls.map(img => ({
        work_id: workData.id,
        image_url: img.url,
        display_order: img.order,
        is_featured: img.isFeatured,
      }));

      const { error: imagesError } = await supabase
        .from('work_images')
        .insert(imagesToInsert);

      if (imagesError) {
        console.error('Images insertion error:', imagesError);
        setErrorMessage('Failed to save images');
        setShowErrorModal(true);
        setIsSubmitting(false);
        return;
      }

      setShowSuccessModal(true);
      setTimeout(() => {
        router.push('/admin/works');
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('An error occurred');
      setShowErrorModal(true);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar onOpenModal={() => {}} />
      
      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-6 md:p-20 transition-colors">
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
            <h1 className="text-5xl md:text-6xl font-cormorant font-medium mb-2">
              Upload New Work
            </h1>
            <p className="text-black/60 dark:text-white/60">
              Create an album with up to {MAX_IMAGES} images
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-lg p-8 space-y-6 transition-colors shadow-sm">
              <h2 className="text-lg font-cormorant font-medium">Work Information</h2>

              <div>
                <label className="block text-sm font-bold text-black/80 dark:text-white/80 mb-3">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter work title"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-black/10 dark:border-white/10 rounded-lg text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-black/80 dark:text-white/80 mb-3">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter work description (optional)"
                  rows={4}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-black/10 dark:border-white/10 rounded-lg text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black/80 dark:text-white/80 mb-3">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-black/10 dark:border-white/10 rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-black/80 dark:text-white/80 mb-3">Status</label>
                  <select
                    value={isPublished ? 'published' : 'unpublished'}
                    onChange={(e) => setIsPublished(e.target.value === 'published')}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-black/10 dark:border-white/10 rounded-lg text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 transition-colors"
                  >
                    <option value="published">Published</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Images Upload */}
            <div className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-lg p-8 space-y-6 transition-colors shadow-sm">
              <h2 className="text-lg font-cormorant font-medium">
                Images (Up to {MAX_IMAGES})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {images.map((image, index) => (
                  <div key={index} className="border-2 border-dashed border-black/20 dark:border-white/20 rounded-lg p-4">
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
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium text-sm"
                            >
                              <X size={16} />
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetFeatured(index)}
                              className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                                image.isFeatured
                                  ? 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-800/50'
                                  : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
                              }`}
                            >
                              {image.isFeatured ? '⭐ Featured' : 'Set Featured'}
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
                            <Upload size={32} className="text-black/40 dark:text-white/40 mb-2" />
                            <p className="text-sm font-medium text-black/60 dark:text-white/60">Image {index + 1}</p>
                            <p className="text-xs text-black/40 dark:text-white/40">Click to upload</p>
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
                className="flex-1 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-black/90 dark:hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isSubmitting ? 'Uploading...' : 'Create Work'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/works')}
                className="flex-1 px-6 py-3 border border-black/20 dark:border-white/20 text-black dark:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-black/5 dark:border-white/5 rounded-lg p-8 max-w-sm w-full text-center shadow-xl animate-in fade-in zoom-in duration-300 transition-colors">
            <div className="flex justify-center mb-4">
              <CheckCircle size={64} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-cormorant font-medium text-black dark:text-white mb-2">
              Work Created Successfully!
            </h2>
            <p className="text-black/60 dark:text-white/60 mb-6">
              Your work has been uploaded and saved to the gallery.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push('/admin/works');
                }}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                View Works
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-black/5 dark:border-white/5 rounded-lg p-8 max-w-sm w-full text-center shadow-xl animate-in fade-in zoom-in duration-300 transition-colors">
            <div className="flex justify-center mb-4">
              <AlertCircle size={64} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-cormorant font-medium text-black dark:text-white mb-2">
              Upload Failed
            </h2>
            <p className="text-black/60 dark:text-white/60 mb-6">
              {errorMessage}
            </p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}
