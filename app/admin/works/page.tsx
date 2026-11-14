'use client';

import { useEffect, useState } from 'react';
import ConfirmDialog from '../../component/ConfirmDialog';
import { Button, EmptyState, PageHeader, Tag } from '../../component/ui';
import { useToast } from '../../context/ToastContext';
import { formatIdr } from '../../lib/categories';
import { isReserved } from '../../lib/sales';
import { AdminRow, ListSkeleton } from '../_components/AdminParts';

interface Work {
  id: string;
  title: string;
  category: string;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  price_idr: number | null;
  is_for_sale: boolean;
  sold_at: string | null;
  reserved_until: string | null;
  featured_image_url: string | null;
}

/** One page of the works, newest first. Null when the request failed. */
async function fetchWorksPage(page: number): Promise<{ works: Work[]; total: number; hasMore: boolean } | null> {
  try {
    const res = await fetch(`/api/admin/works?page=${page}`);
    if (!res.ok) {
      console.error('Error fetching works:', await res.text());
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error('Error fetching works:', error);
    return null;
  }
}

function saleLine(work: Work): string {
  if (work.sold_at) return `Terjual ${formatIdr(work.price_idr ?? 0)}`;
  if (work.is_for_sale && work.price_idr != null) return formatIdr(work.price_idr);
  return 'Tidak dijual';
}

export default function AdminWorks() {
  const { showToast } = useToast();
  const [works, setWorks] = useState<Work[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Work | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetchWorksPage(page).then((result) => {
      if (ignore) return;
      if (result) {
        setWorks((prev) => (page === 0 ? result.works : [...prev, ...result.works]));
        setTotal(result.total);
        setHasMore(result.hasMore);
      } else {
        setFailed(true);
      }
      setLoading(false);
      setLoadingMore(false);
    });
    return () => {
      ignore = true;
    };
  }, [page]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/works/${pendingDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        showToast({ type: 'error', message: detail?.error || 'Karya gagal dihapus.' });
        return;
      }
      setWorks((prev) => prev.filter((w) => w.id !== pendingDelete.id));
      setTotal((prev) => Math.max(0, prev - 1));
      showToast({ type: 'success', message: 'Karya dihapus.' });
    } catch (error) {
      console.error('Error deleting work:', error);
      showToast({ type: 'error', message: 'Karya gagal dihapus. Periksa koneksi Anda.' });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8">
      <PageHeader
        eyebrow="Admin"
        title="Karya"
        description={loading ? 'Memuat…' : `${total} karya di arsip.`}
        actions={<Button href="/admin/works/create">Unggah karya</Button>}
      />

      {loading ? (
        <ListSkeleton label="Memuat karya" />
      ) : failed && works.length === 0 ? (
        <EmptyState
          title="Karya gagal dimuat"
          description="Periksa koneksi Anda, lalu muat ulang halaman."
          action={
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Muat ulang
            </Button>
          }
        />
      ) : works.length === 0 ? (
        <EmptyState
          title="Belum ada karya"
          description="Unggah karya pertama untuk mengisi arsip studio."
          action={<Button href="/admin/works/create">Unggah karya pertama</Button>}
        />
      ) : (
        <>
          <ul className="border-t border-line">
            {works.map((work) => (
              <AdminRow
                key={work.id}
                imageUrl={work.featured_image_url ?? null}
                title={work.title}
                tags={
                  <>
                    {work.sold_at ? (
                      <Tag variant="solid">Terjual</Tag>
                    ) : (
                      isReserved(work) && <Tag variant="dashed">Sedang dibeli</Tag>
                    )}
                    {!work.is_published && <Tag variant="dashed">Disembunyikan</Tag>}
                    {work.is_featured && <Tag>Pilihan</Tag>}
                  </>
                }
                meta={[work.category, new Date(work.created_at).toLocaleDateString('id-ID'), saleLine(work)].join(' · ')}
                actions={
                  <>
                    <Button variant="secondary" size="sm" href={`/admin/works/${work.id}/edit`}>
                      Ubah
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setPendingDelete(work)}>
                      Hapus
                    </Button>
                  </>
                }
              />
            ))}
          </ul>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                loading={loadingMore}
                onClick={() => {
                  setLoadingMore(true);
                  setPage((p) => p + 1);
                }}
              >
                Muat lebih banyak ({works.length}/{total})
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Hapus karya?"
        message={
          pendingDelete
            ? `"${pendingDelete.title}" beserta semua gambarnya akan dihapus permanen dan tidak bisa dikembalikan.`
            : ''
        }
        confirmLabel="Hapus"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
