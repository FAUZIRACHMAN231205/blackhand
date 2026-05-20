'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { isAdmin } from '../../../lib/adminUtils';
import { supabase } from '../../../lib/supabaseClient';
import Navbar from '../../../component/Navbar';
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

export default function EditWork() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const workId = params.id as string;

  const [work, setWork] = useState<Work | null>(null);
  const [workImages, setWorkImages] = useState<WorkImage[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Paintings');
  const [isPublished, setIsPublished] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (!isAdmin(user.email)) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && isAdmin(user.email)) {
      fetchWork();
    }
  }, [user, workId]);

  const fetchWork = async () => {
    try {
      // Fetch work
      const { data: workData, error: workError } = await supabase
        .from('works')
        .select('*')
        .eq('id', workId)
        .single();

      if (workError) {
        console.error('Error fetching work:', workError);
        alert('Work not found');
        router.push('/admin/works');
        return;
      }

      setWork(workData);
      setTitle(workData.title);
      setDescription(workData.description || '');
      setCategory(workData.category);
      setIsPublished(workData.is_published);

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

      setWorkImages(imagesData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Delete this image?')) return;

    try {
      const { error } = await supabase
        .from('work_images')
        .delete()
        .eq('id', imageId);

      if (error) {
        alert('Failed to delete image');
        return;
      }

      setWorkImages(workImages.filter(img => img.id !== imageId));
      alert('Image deleted');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSetFeatured = async (imageId: string) => {
    try {
      // Remove featured from all images
      const { error: removeError } = await supabase
        .from('work_images')
        .update({ is_featured: false })
        .eq('work_id', workId);

      if (removeError) throw removeError;

      // Set featured for selected image
      const { error: setError } = await supabase
        .from('work_images')
        .update({ is_featured: true })
        .eq('id', imageId);

      if (setError) throw setError;

      // Update local state
      const updatedImages = workImages.map(img => ({
        ...img,
        is_featured: img.id === imageId,
      }));
      setWorkImages(updatedImages);
      alert('Featured image updated');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to update featured image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!title.trim()) {
        alert('Title is required');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('works')
        .update({
          title: title.trim(),
          description: description.trim(),
          category,
          is_published: isPublished,
        })
        .eq('id', workId);

      if (error) {
        console.error('Update error:', error);
        alert('Failed to update work');
        setIsSubmitting(false);
        return;
      }

      alert('Work updated successfully!');
      router.push('/admin/works');
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred');
      setIsSubmitting(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin(user.email)) {
    return null;
  }

  return (
    <>
      <Navbar onOpenModal={() => {}} />
      
      <main className="min-h-[100dvh] bg-white text-black pt-24 p-6 md:p-20">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/admin/works')}
            className="flex items-center gap-2 mb-8 text-black/60 hover:text-black transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-sans text-sm font-medium">Back to Works</span>
          </button>

          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl md:text-6xl font-cormorant font-medium mb-2">
              Edit Work
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="bg-white border border-black/10 rounded-lg p-8 space-y-6">
              <h2 className="text-lg font-cormorant font-medium">Work Information</h2>

              <div>
                <label className="block text-sm font-bold text-black/80 mb-3">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-black/80 mb-3">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-black/80 mb-3">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-black/80 mb-3">Status</label>
                  <select
                    value={isPublished ? 'published' : 'unpublished'}
                    onChange={(e) => setIsPublished(e.target.value === 'published')}
                    className="w-full px-4 py-3 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
                  >
                    <option value="published">Published</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="bg-white border border-black/10 rounded-lg p-8 space-y-6">
              <h2 className="text-lg font-cormorant font-medium">Images ({workImages.length})</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {workImages.map((image) => (
                  <div key={image.id} className="border border-black/10 rounded-lg overflow-hidden">
                    <img
                      src={image.image_url}
                      alt={`Work image ${image.display_order}`}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4 space-y-2">
                      <p className="text-sm text-black/60">Image {image.display_order}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSetFeatured(image.id)}
                          className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                            image.is_featured
                              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                              : 'bg-black/5 text-black/60 hover:bg-black/10'
                          }`}
                        >
                          {image.is_featured ? '⭐ Featured' : 'Set Featured'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(image.id)}
                          className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
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
                className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isSubmitting ? 'Updating...' : 'Update Work'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/works')}
                className="flex-1 px-6 py-3 border border-black/20 text-black rounded-lg hover:bg-black/5 transition-colors font-medium"
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
