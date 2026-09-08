'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { isAdmin } from '../../../../lib/adminUtils';
import Navbar from '../../../../component/Navbar';
import { LoadingSpinner } from '../../../../component/LoadingStates';
import ConfirmDialog from '../../../../component/ConfirmDialog';
import { useToast } from '../../../../context/ToastContext';
import { ChevronLeft } from 'lucide-react';

interface Work {
  id: string;
  title: string;
  description: string;
  category: string;
  is_published: boolean;
}

interface WorkImage {
  id: string;
  image_url: string;
  display_order: number;
  is_featured: boolean;
}

const CATEGORIES = ['Paintings', 'Digital Art', 'Sculptures'];

const inputClass =
  'w-full px-4 py-3.5 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/10 transition-all font-sans text-sm';
const labelClass = 'block font-sans text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2.5';
const cardClass = 'bg-white/80 dark:bg-zinc-950/60 border border-black/5 dark:border-white/10 rounded-2xl p-5 sm:p-8 space-y-6 transition-colors shadow-sm backdrop-blur-sm';

export default function EditWork() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const workId = params.id as string;
  const { showToast } = useToast();

  const [, setWork] = useState<Work | null>(null);
  const [workImages, setWorkImages] = useState<WorkImage[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Paintings');
  const [isPublished, setIsPublished] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeleteImage, setPendingDeleteImage] = useState<WorkImage | null>(null);
  const [deletingImage, setDeletingImage] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (!isAdmin(user)) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  const fetchWork = async () => {
    try {
      const res = await fetch(`/api/admin/works/${workId}`);

      if (!res.ok) {
        console.error('Error fetching work:', await res.text());
        showToast({ type: 'error', message: 'Work not found' });
        router.push('/admin/works');
        return;
      }

      const { work: workData, images: imagesData } = await res.json();

      setWork(workData);
      setTitle(workData.title);
      setDescription(workData.description || '');
      setCategory(workData.category);
      setIsPublished(workData.is_published);
      setWorkImages(imagesData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin(user)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchWork();
    }
  }, [user, workId]);

  const confirmDeleteImage = async () => {
    if (!pendingDeleteImage) return;
    setDeletingImage(true);

    try {
      const res = await fetch(`/api/admin/images/${pendingDeleteImage.id}`, { method: 'DELETE' });

      if (!res.ok) {
        showToast({ type: 'error', message: 'Failed to delete image' });
        return;
      }

      setWorkImages((prev) => prev.filter((img) => img.id !== pendingDeleteImage.id));
      showToast({ type: 'success', message: 'Image deleted successfully' });
    } catch (error) {
      console.error('Error:', error);
      showToast({ type: 'error', message: 'Failed to delete image' });
    } finally {
      setDeletingImage(false);
      setPendingDeleteImage(null);
    }
  };

  const handleSetFeatured = async (imageId: string) => {
    try {
      const res = await fetch(`/api/admin/images/${imageId}`, { method: 'PATCH' });
      if (!res.ok) throw new Error(await res.text());

      // Update local state
      const updatedImages = workImages.map((img) => ({
        ...img,
        is_featured: img.id === imageId,
      }));
      setWorkImages(updatedImages);
      showToast({ type: 'success', message: 'Featured image updated' });
    } catch (error) {
      console.error('Error:', error);
      showToast({ type: 'error', message: 'Failed to update featured image' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!title.trim()) {
        showToast({ type: 'error', message: 'Title is required' });
        setIsSubmitting(false);
        return;
      }

      const res = await fetch(`/api/admin/works/${workId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          is_published: isPublished,
        }),
      });

      if (!res.ok) {
        console.error('Update error:', await res.text());
        showToast({ type: 'error', message: 'Failed to update work' });
        setIsSubmitting(false);
        return;
      }

      showToast({ type: 'success', message: 'Work updated successfully!' });
      router.push('/admin/works');
    } catch (error) {
      console.error('Error:', error);
      showToast({ type: 'error', message: 'An error occurred' });
      setIsSubmitting(false);
    }
  };

  if (loading || isLoading) {
    return <LoadingSpinner />;
  }

  if (!user || !isAdmin(user)) {
    return null;
  }

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
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl italic font-medium mb-2">
              Edit Work
            </h1>
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
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Category</label>
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

            {/* Images */}
            <div className={cardClass}>
              <h2 className="font-serif text-lg italic">Images ({workImages.length})</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {workImages.map((image) => (
                  <div key={image.id} className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden transition-colors shadow-sm">
                    <img
                      src={image.image_url}
                      alt={`Work image ${image.display_order}`}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4 space-y-2">
                      <p className="font-sans text-xs text-black/50 dark:text-white/50">Image {image.display_order}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetFeatured(image.id)}
                          className={`flex-1 px-3 py-2 rounded-lg transition-colors font-sans text-xs font-bold ${
                            image.is_featured
                              ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300/60 dark:border-amber-800/50'
                              : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
                          }`}
                        >
                          {image.is_featured ? '★ Featured' : 'Set Featured'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteImage(image)}
                          className="flex-1 px-3 py-2 bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-lg hover:bg-rose-500/20 transition-colors font-sans text-xs font-bold"
                        >
                          Delete
                        </button>
                      </div>
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
                {isSubmitting ? 'Updating...' : 'Update Work'}
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

      <ConfirmDialog
        isOpen={pendingDeleteImage !== null}
        title="Delete image?"
        message="This image will be permanently removed from the work."
        confirmLabel="Delete"
        loading={deletingImage}
        onConfirm={confirmDeleteImage}
        onCancel={() => setPendingDeleteImage(null)}
      />
    </>
  );
}
