'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice, PageHeader } from '../../../component/ui';
import { useToast } from '../../../context/ToastContext';
import { MAX_IMAGES_PER_PRODUCT } from '../../../lib/shop';
import { checkPhotoFile, uploadProductPhoto } from '../../../lib/productUpload';
import { AddPhotoTile, FormSection, PhotoTile, TileButton } from '../../_components/AdminParts';
import ProductFields, {
  EMPTY_PRODUCT,
  checkProduct,
  firstProductError,
  productPayload,
  type ProductDraft,
  type ProductErrors,
} from '../../_components/ProductFields';

interface PickedPhoto {
  file: File;
  preview: string;
}

export default function CreateProduct() {
  const router = useRouter();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_PRODUCT);
  const [errors, setErrors] = useState<ProductErrors>({});
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Release the in-memory previews still held when the page goes away.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

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
      showToast({ type: 'info', message: `Satu produk paling banyak ${MAX_IMAGES_PER_PRODUCT} foto.` });
    }
    setPhotos((prev) => [...prev, ...accepted]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photos[index].preview);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // The first photo is the cover: "Jadikan sampul" moves it to the front.
  const makeCover = (index: number) => {
    setPhotos((prev) => [prev[index], ...prev.filter((_, i) => i !== index)]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (progress) return;

    const fieldErrors = checkProduct(draft);
    setErrors(fieldErrors);
    setFormError(null);
    const first = firstProductError(fieldErrors);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }

    setProgress('Menyimpan produk');
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload(draft)),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Produk gagal dibuat.');
        setProgress(null);
        return;
      }

      const productId = data.product.id as string;
      let failed = 0;
      for (const [index, photo] of photos.entries()) {
        setProgress(`Mengunggah foto ${index + 1} dari ${photos.length}`);
        try {
          await uploadProductPhoto(productId, photo.file);
        } catch (err) {
          failed += 1;
          console.error('Photo upload failed:', err);
        }
      }

      if (failed > 0) {
        showToast({ type: 'error', message: `Produk tersimpan, tetapi ${failed} foto gagal. Tambahkan lagi di halaman ini.` });
        router.push(`/admin/products/${productId}/edit`);
        return;
      }
      showToast({ type: 'success', message: 'Produk berhasil dibuat.' });
      router.push('/admin/products');
    } catch (err) {
      console.error('Create product error:', err);
      setFormError('Terjadi kesalahan. Periksa koneksi Anda lalu coba lagi.');
      setProgress(null);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-10">
      <PageHeader
        eyebrow="Admin · Produk"
        title="Tambah produk"
        description={`Aksesori atau merchandise, dengan sampai ${MAX_IMAGES_PER_PRODUCT} foto.`}
      />

      <ProductFields draft={draft} onChange={setDraft} errors={errors} />

      <FormSection
        title={`Foto · ${photos.length}/${MAX_IMAGES_PER_PRODUCT}`}
        aside="Foto pertama jadi sampul. Foto diperkecil ke 1200 px untuk toko."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <PhotoTile key={photo.preview} src={photo.preview} alt={`Foto ${index + 1}`} cover={index === 0}>
              {index > 0 && <TileButton onClick={() => makeCover(index)}>Jadikan sampul</TileButton>}
              <TileButton tone="danger" onClick={() => removePhoto(index)}>
                Lepas
              </TileButton>
            </PhotoTile>
          ))}
          {photos.length < MAX_IMAGES_PER_PRODUCT && <AddPhotoTile label="Tambah foto" multiple onFiles={pickPhotos} />}
        </div>
      </FormSection>

      {formError && <Notice tone="error">{formError}</Notice>}

      <div className="flex flex-wrap items-center gap-3 border-t border-ink pt-6">
        <Button type="submit" loading={progress !== null}>
          {progress ?? 'Simpan produk'}
        </Button>
        <Button variant="ghost" href="/admin/products">
          Batal
        </Button>
      </div>
    </form>
  );
}
