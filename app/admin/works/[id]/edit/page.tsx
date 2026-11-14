'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ConfirmDialog from '../../../../component/ConfirmDialog';
import { Button, EmptyState, Notice, PageHeader } from '../../../../component/ui';
import { useToast } from '../../../../context/ToastContext';
import { FormSection, ListSkeleton, PhotoTile, TileButton } from '../../../_components/AdminParts';
import WorkFields, { EMPTY_WORK, checkWork, workPayload, type WorkDraft, type WorkErrors } from '../../../_components/WorkFields';

interface WorkImage {
  id: string;
  image_url: string;
  display_order: number;
  is_featured: boolean;
}

export default function EditWork() {
  const router = useRouter();
  const { id: workId } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [draft, setDraft] = useState<WorkDraft>(EMPTY_WORK);
  const [errors, setErrors] = useState<WorkErrors>({});
  const [soldAt, setSoldAt] = useState<string | null>(null);
  const [images, setImages] = useState<WorkImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyImage, setBusyImage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WorkImage | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/works/${workId}`);
      if (!res.ok) {
        setState('missing');
        return;
      }
      const { work, images: imageRows } = await res.json();
      setDraft({
        title: work.title,
        description: work.description || '',
        category: work.category,
        isPublished: work.is_published,
        isForSale: Boolean(work.is_for_sale),
        price: work.price_idr == null ? '' : String(work.price_idr),
      });
      setSoldAt(work.sold_at ?? null);
      setImages(imageRows || []);
      setState('ready');
    } catch (error) {
      console.error('Error loading work:', error);
      setState('missing');
    }
  }, [workId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = checkWork(draft);
    setErrors(fieldErrors);
    setFormError(null);
    if (Object.keys(fieldErrors).length > 0) {
      document.getElementById(fieldErrors.title ? 'work-title' : 'work-price')?.focus();
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/works/${workId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workPayload(draft)),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        setFormError(detail?.error || 'Perubahan gagal disimpan.');
        return;
      }
      showToast({ type: 'success', message: 'Perubahan disimpan.' });
      router.push('/admin/works');
    } catch (error) {
      console.error('Update work error:', error);
      setFormError('Perubahan gagal disimpan. Periksa koneksi Anda.');
    } finally {
      setSaving(false);
    }
  };

  const makeCover = async (image: WorkImage) => {
    setBusyImage(image.id);
    try {
      const res = await fetch(`/api/admin/images/${image.id}`, { method: 'PATCH' });
      if (!res.ok) throw new Error(await res.text());
      setImages((prev) => prev.map((img) => ({ ...img, is_featured: img.id === image.id })));
      showToast({ type: 'success', message: 'Sampul diganti.' });
    } catch (error) {
      console.error('Set cover error:', error);
      showToast({ type: 'error', message: 'Sampul gagal diganti.' });
    } finally {
      setBusyImage(null);
    }
  };

  const confirmDeleteImage = async () => {
    if (!pendingDelete) return;
    setBusyImage(pendingDelete.id);
    try {
      const res = await fetch(`/api/admin/images/${pendingDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      setImages((prev) => prev.filter((img) => img.id !== pendingDelete.id));
      showToast({ type: 'success', message: 'Gambar dihapus.' });
    } catch (error) {
      console.error('Delete image error:', error);
      showToast({ type: 'error', message: 'Gambar gagal dihapus.' });
    } finally {
      setBusyImage(null);
      setPendingDelete(null);
    }
  };

  if (state === 'loading') return <ListSkeleton rows={3} label="Memuat karya" />;

  if (state === 'missing') {
    return (
      <EmptyState
        title="Karya tidak ditemukan"
        description="Karya ini mungkin sudah dihapus."
        action={<Button href="/admin/works">Kembali ke daftar karya</Button>}
      />
    );
  }

  return (
    <form onSubmit={save} noValidate className="grid grid-cols-1 gap-10">
      <PageHeader eyebrow="Admin · Karya" title="Ubah karya" description={draft.title} />

      <WorkFields draft={draft} onChange={setDraft} errors={errors} soldAt={soldAt} />

      <FormSection title={`Gambar · ${images.length}`} aside="Perubahan gambar langsung tersimpan.">
        {images.length === 0 ? (
          <p className="font-sans text-sm text-mute">Karya ini belum punya gambar.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {images.map((image) => (
              <PhotoTile key={image.id} src={image.image_url} alt={`Gambar ${image.display_order}`} cover={image.is_featured}>
                {!image.is_featured && (
                  <TileButton onClick={() => makeCover(image)} disabled={busyImage !== null}>
                    Jadikan sampul
                  </TileButton>
                )}
                <TileButton tone="danger" onClick={() => setPendingDelete(image)} disabled={busyImage !== null}>
                  Hapus
                </TileButton>
              </PhotoTile>
            ))}
          </div>
        )}
      </FormSection>

      {formError && <Notice tone="error">{formError}</Notice>}

      <div className="flex flex-wrap items-center gap-3 border-t border-ink pt-6">
        <Button type="submit" loading={saving}>
          Simpan perubahan
        </Button>
        <Button variant="ghost" href="/admin/works">
          Batal
        </Button>
      </div>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Hapus gambar?"
        message="Gambar ini akan dihapus permanen dari karya dan tidak bisa dikembalikan."
        confirmLabel="Hapus"
        loading={busyImage !== null}
        onConfirm={confirmDeleteImage}
        onCancel={() => setPendingDelete(null)}
      />
    </form>
  );
}
