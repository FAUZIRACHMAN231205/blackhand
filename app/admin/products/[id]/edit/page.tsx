'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { useAuth } from '../../../../hooks/useAuth';
import { isAdmin } from '../../../../lib/adminUtils';
import { useToast } from '../../../../context/ToastContext';
import { MAX_IMAGES_PER_PRODUCT, validateProductInput } from '../../../../lib/shop';
import { checkPhotoFile, uploadProductPhoto } from '../../../../lib/productUpload';
import Navbar from '../../../../component/Navbar';
import { LoadingSpinner } from '../../../../component/LoadingStates';
import ConfirmDialog from '../../../../component/ConfirmDialog';
import ProductFields, {
  EMPTY_PRODUCT,
  adminCardClass,
  productPayload,
  type ProductDraft,
} from '../../../../component/ProductFields';
import type { ProductImage } from '../../../../types';

export default function EditProduct() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_PRODUCT);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [busyImage, setBusyImage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductImage | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/');
      else if (!isAdmin(user)) router.push('/dashboard');
    }
  }, [user, loading, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/products/${id}`);
      if (!res.ok) {
        showToast({ type: 'error', message: 'Product not found' });
        router.push('/admin/products');
        return;
      }
      const data = await res.json();
      setDraft({
        name: data.product.name,
        description: data.product.description ?? '',
        price: String(data.product.price_idr),
        compareAtPrice:
          data.product.compare_at_price_idr != null ? String(data.product.compare_at_price_idr) : '',
        stock: String(data.product.stock),
        isPublished: data.product.is_published,
      });
      setImages(data.images);
    } catch (err) {
      console.error('Error loading product:', err);
    } finally {
      setLoadingProduct(false);
    }
  }, [id, router, showToast]);

  useEffect(() => {
    if (!user || !isAdmin(user)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [user, load]);

  const reloadImages = async () => {
    const res = await fetch(`/api/admin/products/${id}`);
    if (res.ok) setImages((await res.json()).images);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = productPayload(draft);
    const invalid = validateProductInput(payload);
    if (invalid) {
      showToast({ type: 'error', message: invalid });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ type: 'error', message: data.error || 'Failed to update product' });
        return;
      }
      showToast({ type: 'success', message: 'Product updated' });
      router.push('/admin/products');
    } catch (err) {
      console.error('Update product error:', err);
      showToast({ type: 'error', message: 'An error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files || uploading) return;
    const room = MAX_IMAGES_PER_PRODUCT - images.length;
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) {
      showToast({ type: 'info', message: `A product can have at most ${MAX_IMAGES_PER_PRODUCT} photos` });
    }

    for (const [index, file] of picked.entries()) {
      const problem = checkPhotoFile(file);
      if (problem) {
        showToast({ type: 'error', message: `${file.name}: ${problem}` });
        continue;
      }
      setUploading(`Uploading ${index + 1} of ${picked.length}…`);
      try {
        await uploadProductPhoto(id, file);
      } catch (err) {
        showToast({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed' });
      }
    }
    setUploading(null);
    await reloadImages();
  };

  const makeCover = async (image: ProductImage) => {
    setBusyImage(image.id);
    try {
      const res = await fetch(`/api/admin/product-images/${image.id}`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      await reloadImages();
      showToast({ type: 'success', message: 'Cover photo updated' });
    } catch {
      showToast({ type: 'error', message: 'Failed to update cover' });
    } finally {
      setBusyImage(null);
    }
  };

  const confirmDeleteImage = async () => {
    if (!pendingDelete) return;
    setBusyImage(pendingDelete.id);
    try {
      const res = await fetch(`/api/admin/product-images/${pendingDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setImages((prev) => prev.filter((img) => img.id !== pendingDelete.id));
      await reloadImages();
      showToast({ type: 'success', message: 'Photo deleted' });
    } catch {
      showToast({ type: 'error', message: 'Failed to delete photo' });
    } finally {
      setBusyImage(null);
      setPendingDelete(null);
    }
  };

  if (loading || loadingProduct) return <LoadingSpinner />;
  if (!user || !isAdmin(user)) return null;

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

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl italic font-medium mb-12">Edit Product</h1>

          <form onSubmit={save} className="space-y-8">
            <ProductFields draft={draft} onChange={setDraft} />

            <div className={adminCardClass}>
              <h2 className="font-serif text-lg italic">
                Photos ({images.length}/{MAX_IMAGES_PER_PRODUCT})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {images.map((image, index) => (
                  <div key={image.id} className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                    <div className="relative aspect-square">
                      <img src={image.image_url} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                      {index === 0 && (
                        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 font-sans text-[9px] font-bold text-black">
                          <Star size={10} className="fill-current" /> Cover
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 p-2">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => makeCover(image)}
                          disabled={busyImage !== null}
                          className="min-h-[44px] flex-1 rounded-lg bg-black/5 px-2 font-sans text-[11px] font-bold transition-colors hover:bg-black/10 disabled:opacity-50 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          Set cover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingDelete(image)}
                        disabled={busyImage !== null}
                        aria-label={`Delete photo ${index + 1}`}
                        className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-rose-500/10 px-2 text-rose-500 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        {busyImage === image.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                ))}
                {images.length < MAX_IMAGES_PER_PRODUCT && (
                  <label
                    className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/10 transition-colors hover:border-violet-500/40 dark:border-white/15 ${
                      uploading ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addPhotos(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    {uploading ? (
                      <Loader2 size={24} className="mb-2 animate-spin opacity-60" />
                    ) : (
                      <ImagePlus size={26} strokeWidth={1.5} className="mb-2 text-black/30 dark:text-white/30" />
                    )}
                    <span className="px-2 text-center font-sans text-xs font-bold text-black/60 dark:text-white/60">
                      {uploading ?? 'Add photos'}
                    </span>
                  </label>
                )}
              </div>
              <p className="font-sans text-[11px] text-black/50 dark:text-white/50">
                Photo changes are saved right away. The first photo is the cover.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 disabled:opacity-50 transition-all font-sans text-[11px] font-black uppercase tracking-[0.2em]"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/products')}
                className="flex-1 px-6 py-3.5 border border-black/10 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all font-sans text-[11px] font-black uppercase tracking-[0.2em]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete photo?"
        message="This photo will be removed from the product."
        confirmLabel="Delete"
        loading={busyImage !== null}
        onConfirm={confirmDeleteImage}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
