'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ImagePlus, Loader2, Star, X } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { isAdmin } from '../../../lib/adminUtils';
import { useToast } from '../../../context/ToastContext';
import { MAX_IMAGES_PER_PRODUCT, validateProductInput } from '../../../lib/shop';
import { checkPhotoFile, uploadProductPhoto } from '../../../lib/productUpload';
import Navbar from '../../../component/Navbar';
import { LoadingSpinner } from '../../../component/LoadingStates';
import ProductFields, {
  EMPTY_PRODUCT,
  adminCardClass,
  productPayload,
  type ProductDraft,
} from '../../../component/ProductFields';

interface PickedPhoto {
  file: File;
  preview: string;
}

export default function CreateProduct() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_PRODUCT);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/');
      else if (!isAdmin(user)) router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Release the in-memory previews still held when the page goes away.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  if (loading || !user || !isAdmin(user)) return <LoadingSpinner />;

  const pickPhotos = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_IMAGES_PER_PRODUCT - photos.length;
    const accepted: PickedPhoto[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      const problem = checkPhotoFile(file);
      if (problem) {
        showToast({ type: 'error', message: `${file.name}: ${problem}` });
        continue;
      }
      accepted.push({ file, preview: URL.createObjectURL(file) });
    }
    if (files.length > room) {
      showToast({ type: 'info', message: `A product can have at most ${MAX_IMAGES_PER_PRODUCT} photos` });
    }
    setPhotos((prev) => [...prev, ...accepted]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photos[index].preview);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (progress) return;

    const payload = productPayload(draft);
    const invalid = validateProductInput(payload);
    if (invalid) {
      showToast({ type: 'error', message: invalid });
      return;
    }

    setProgress('Saving product…');
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ type: 'error', message: data.error || 'Failed to create product' });
        setProgress(null);
        return;
      }

      const productId = data.product.id as string;
      let failed = 0;
      for (const [index, photo] of photos.entries()) {
        setProgress(`Uploading photo ${index + 1} of ${photos.length}…`);
        try {
          await uploadProductPhoto(productId, photo.file);
        } catch (err) {
          failed += 1;
          console.error('Photo upload failed:', err);
        }
      }

      if (failed > 0) {
        showToast({ type: 'error', message: `Product saved, but ${failed} photo(s) failed. Add them from Edit.` });
        router.push(`/admin/products/${productId}/edit`);
        return;
      }
      showToast({ type: 'success', message: 'Product created' });
      router.push('/admin/products');
    } catch (err) {
      console.error('Create product error:', err);
      showToast({ type: 'error', message: 'An error occurred' });
      setProgress(null);
    }
  };

  return (
    <>
      <Navbar onOpenModal={() => {}} />

      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-6 md:p-20 transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/admin/products')}
            className="flex items-center gap-2 py-2 mb-6 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-sans text-sm font-medium">Back to Products</span>
          </button>

          <div className="mb-12">
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl italic font-medium mb-2">New Product</h1>
            <p className="font-sans text-sm text-black/60 dark:text-white/60">
              Accessories or merchandise, with up to {MAX_IMAGES_PER_PRODUCT} photos
            </p>
          </div>

          <form onSubmit={submit} className="space-y-8">
            <ProductFields draft={draft} onChange={setDraft} />

            <div className={adminCardClass}>
              <h2 className="font-serif text-lg italic">
                Photos ({photos.length}/{MAX_IMAGES_PER_PRODUCT})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {photos.map((photo, index) => (
                  <div key={photo.preview} className="relative aspect-square overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                    <img src={photo.preview} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                    {index === 0 && (
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 font-sans text-[9px] font-bold text-black">
                        <Star size={10} className="fill-current" /> Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      aria-label={`Remove photo ${index + 1}`}
                      className="absolute right-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_IMAGES_PER_PRODUCT && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/10 transition-colors hover:border-violet-500/40 dark:border-white/15">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        pickPhotos(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <ImagePlus size={26} strokeWidth={1.5} className="mb-2 text-black/30 dark:text-white/30" />
                    <span className="font-sans text-xs font-bold text-black/60 dark:text-white/60">Add photos</span>
                  </label>
                )}
              </div>
              <p className="font-sans text-[11px] text-black/50 dark:text-white/50">
                The first photo is the cover. Photos are resized to 1200px for the shop.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={progress !== null}
                className="flex flex-1 items-center justify-center gap-2 px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 disabled:opacity-50 transition-all font-sans text-[11px] font-black uppercase tracking-[0.2em]"
              >
                {progress && <Loader2 size={14} className="animate-spin" />}
                {progress ?? 'Create Product'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/products')}
                disabled={progress !== null}
                className="flex-1 px-6 py-3.5 border border-black/10 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all font-sans text-[11px] font-black uppercase tracking-[0.2em]"
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
