'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ConfirmDialog from '../../../../component/ConfirmDialog';
import { Button, EmptyState, Notice, PageHeader } from '../../../../component/ui';
import { useToast } from '../../../../context/ToastContext';
import { MAX_IMAGES_PER_PRODUCT } from '../../../../lib/shop';
import { checkPhotoFile, uploadProductPhoto } from '../../../../lib/productUpload';
import { AddPhotoTile, FormSection, ListSkeleton, PhotoTile, TileButton } from '../../../_components/AdminParts';
import ProductFields, {
  EMPTY_PRODUCT,
  checkProduct,
  firstProductError,
  productPayload,
  type ProductDraft,
  type ProductErrors,
} from '../../../_components/ProductFields';
import type { ProductImage } from '../../../../types';

export default function EditProduct() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_PRODUCT);
  const [errors, setErrors] = useState<ProductErrors>({});
  const [images, setImages] = useState<ProductImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [busyImage, setBusyImage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductImage | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/products/${id}`);
      if (!res.ok) {
        setState('missing');
        return;
      }
      const data = await res.json();
      setDraft({
        name: data.product.name,
        description: data.product.description ?? '',
        price: String(data.product.price_idr),
        compareAtPrice: data.product.compare_at_price_idr != null ? String(data.product.compare_at_price_idr) : '',
        stock: String(data.product.stock),
        isPublished: data.product.is_published,
      });
      setImages(data.images);
      setState('ready');
    } catch (err) {
      console.error('Error loading product:', err);
      setState('missing');
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const reloadImages = async () => {
    const res = await fetch(`/api/admin/products/${id}`);
    if (res.ok) setImages((await res.json()).images);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = checkProduct(draft);
    setErrors(fieldErrors);
    setFormError(null);
    const first = firstProductError(fieldErrors);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload(draft)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || 'Perubahan gagal disimpan.');
        return;
      }
      showToast({ type: 'success', message: 'Perubahan disimpan.' });
      router.push('/admin/products');
    } catch (err) {
      console.error('Update product error:', err);
      setFormError('Perubahan gagal disimpan. Periksa koneksi Anda.');
    } finally {
      setSaving(false);
    }
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files || uploading) return;
    const room = MAX_IMAGES_PER_PRODUCT - images.length;
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) {
      showToast({ type: 'info', message: `Satu produk paling banyak ${MAX_IMAGES_PER_PRODUCT} foto.` });
    }

    for (const [index, file] of picked.entries()) {
      const problem = checkPhotoFile(file);
      if (problem) {
        showToast({ type: 'error', message: `${file.name}: ${problem}` });
        continue;
      }
      setUploading(`Mengunggah ${index + 1} dari ${picked.length}`);
      try {
        await uploadProductPhoto(id, file);
      } catch (err) {
        showToast({ type: 'error', message: err instanceof Error ? err.message : 'Foto gagal diunggah.' });
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
      showToast({ type: 'success', message: 'Sampul diganti.' });
    } catch {
      showToast({ type: 'error', message: 'Sampul gagal diganti.' });
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
      showToast({ type: 'success', message: 'Foto dihapus.' });
    } catch {
      showToast({ type: 'error', message: 'Foto gagal dihapus.' });
    } finally {
      setBusyImage(null);
      setPendingDelete(null);
    }
  };

  if (state === 'loading') return <ListSkeleton rows={3} label="Memuat produk" />;

  if (state === 'missing') {
    return (
      <EmptyState
        title="Produk tidak ditemukan"
        description="Produk ini mungkin sudah dihapus."
        action={<Button href="/admin/products">Kembali ke daftar produk</Button>}
      />
    );
  }

  return (
    <form onSubmit={save} noValidate className="grid grid-cols-1 gap-10">
      <PageHeader eyebrow="Admin · Produk" title="Ubah produk" description={draft.name} />

      <ProductFields draft={draft} onChange={setDraft} errors={errors} />

      <FormSection
        title={`Foto · ${images.length}/${MAX_IMAGES_PER_PRODUCT}`}
        aside="Perubahan foto langsung tersimpan. Foto pertama jadi sampul."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((image, index) => (
            <PhotoTile key={image.id} src={image.image_url} alt={`Foto ${index + 1}`} cover={index === 0}>
              {index > 0 && (
                <TileButton onClick={() => makeCover(image)} disabled={busyImage !== null}>
                  Jadikan sampul
                </TileButton>
              )}
              <TileButton tone="danger" onClick={() => setPendingDelete(image)} disabled={busyImage !== null}>
                Hapus
              </TileButton>
            </PhotoTile>
          ))}
          {images.length < MAX_IMAGES_PER_PRODUCT && (
            <AddPhotoTile label="Tambah foto" multiple busy={uploading} onFiles={addPhotos} />
          )}
        </div>
      </FormSection>

      {formError && <Notice tone="error">{formError}</Notice>}

      <div className="flex flex-wrap items-center gap-3 border-t border-ink pt-6">
        <Button type="submit" loading={saving}>
          Simpan perubahan
        </Button>
        <Button variant="ghost" href="/admin/products">
          Batal
        </Button>
      </div>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Hapus foto?"
        message="Foto ini akan dihapus permanen dari produk dan tidak bisa dikembalikan."
        confirmLabel="Hapus"
        loading={busyImage !== null}
        onConfirm={confirmDeleteImage}
        onCancel={() => setPendingDelete(null)}
      />
    </form>
  );
}
