'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice, PageHeader } from '../../../component/ui';
import { useToast } from '../../../context/ToastContext';
// The anon-key client is only used for the signed-URL Storage upload: the
// upload token itself authorises the write, no session needed.
import { supabase } from '../../../lib/supabaseClient';
import { MAX_IMAGES_PER_WORK } from '../../../lib/categories';
import { checkPhotoFile } from '../../../lib/productUpload';
import { AddPhotoTile, FormSection, PhotoTile, TileButton } from '../../_components/AdminParts';
import WorkFields, { EMPTY_WORK, checkWork, workPayload, type WorkDraft, type WorkErrors } from '../../_components/WorkFields';

interface PickedPhoto {
  file: File;
  preview: string;
}

export default function CreateWork() {
  const router = useRouter();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<WorkDraft>(EMPTY_WORK);
  const [errors, setErrors] = useState<WorkErrors>({});
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);
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
    const room = MAX_IMAGES_PER_WORK - photos.length;
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
      showToast({ type: 'info', message: `Satu karya paling banyak ${MAX_IMAGES_PER_WORK} gambar.` });
    }
    if (accepted.length) setPhotoError(null);
    setPhotos((prev) => [...prev, ...accepted]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photos[index].preview);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setCoverIndex((c) => (index === c ? 0 : index < c ? c - 1 : c));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (progress) return;

    const fieldErrors = checkWork(draft);
    const noPhotos = photos.length === 0;
    setErrors(fieldErrors);
    setPhotoError(noPhotos ? 'Unggah minimal 1 gambar.' : null);
    setFormError(null);
    if (Object.keys(fieldErrors).length > 0 || noPhotos) {
      document.getElementById(fieldErrors.title ? 'work-title' : fieldErrors.price ? 'work-price' : 'work-photos')?.focus();
      return;
    }

    setProgress('Menyimpan karya');
    try {
      const createRes = await fetch('/api/admin/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workPayload(draft)),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setFormError(createData.error || 'Karya gagal dibuat.');
        setProgress(null);
        return;
      }
      const workId = createData.work.id as string;

      // Each image: a signed upload slot, the file straight to Storage, then
      // the API records it (and makes the preview everyone sees).
      for (const [index, photo] of photos.entries()) {
        setProgress(`Mengunggah gambar ${index + 1} dari ${photos.length}`);
        const urlRes = await fetch(`/api/admin/works/${workId}/images/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: photo.file.name, contentType: photo.file.type, size: photo.file.size }),
        });
        const urlData = await urlRes.json();
        if (!urlRes.ok) throw new Error(urlData.error || `Gambar ${index + 1} gagal diunggah.`);

        const { error: uploadError } = await supabase.storage
          .from('work-originals')
          .uploadToSignedUrl(urlData.path, urlData.token, photo.file);
        if (uploadError) throw new Error(`Gambar ${index + 1} gagal diunggah.`);

        const persistRes = await fetch(`/api/admin/works/${workId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            original_path: urlData.originalPath,
            display_order: index + 1,
            is_featured: index === coverIndex,
          }),
        });
        if (!persistRes.ok) throw new Error(`Gambar ${index + 1} gagal disimpan.`);
      }

      showToast({ type: 'success', message: 'Karya berhasil dibuat.' });
      router.push('/admin/works');
    } catch (error) {
      console.error('Create work error:', error);
      setFormError(
        error instanceof Error
          ? `${error.message} Karya sudah tersimpan; tambahkan gambar yang kurang dari halaman Ubah.`
          : 'Terjadi kesalahan. Coba lagi.'
      );
      setProgress(null);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-10">
      <PageHeader
        eyebrow="Admin · Karya"
        title="Unggah karya"
        description={`Satu album berisi sampai ${MAX_IMAGES_PER_WORK} gambar. File asli disimpan aman; pengunjung melihat versi pratinjau.`}
      />

      <WorkFields draft={draft} onChange={setDraft} errors={errors} />

      <FormSection title={`Gambar · ${photos.length}/${MAX_IMAGES_PER_WORK}`} aside="Gambar bertanda Sampul tampil di kartu karya.">
        <div id="work-photos" tabIndex={-1} className="grid grid-cols-2 gap-4 outline-none sm:grid-cols-3">
          {photos.map((photo, index) => (
            <PhotoTile key={photo.preview} src={photo.preview} alt={`Gambar ${index + 1}`} cover={index === coverIndex}>
              {index !== coverIndex && <TileButton onClick={() => setCoverIndex(index)}>Jadikan sampul</TileButton>}
              <TileButton tone="danger" onClick={() => removePhoto(index)}>
                Lepas
              </TileButton>
            </PhotoTile>
          ))}
          {photos.length < MAX_IMAGES_PER_WORK && <AddPhotoTile label="Tambah gambar" multiple onFiles={pickPhotos} />}
        </div>
        {photoError && <p className="font-sans text-xs text-accent-text">{photoError}</p>}
      </FormSection>

      {formError && <Notice tone="error">{formError}</Notice>}

      <div className="flex flex-wrap items-center gap-3 border-t border-ink pt-6">
        <Button type="submit" loading={progress !== null}>
          {progress ?? 'Simpan karya'}
        </Button>
        <Button variant="ghost" href="/admin/works">
          Batal
        </Button>
      </div>
    </form>
  );
}
