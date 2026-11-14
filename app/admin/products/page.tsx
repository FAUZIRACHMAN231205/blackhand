'use client';

import { useEffect, useState } from 'react';
import ConfirmDialog from '../../component/ConfirmDialog';
import { Button, EmptyState, PageHeader, Tag, TextField } from '../../component/ui';
import { useToast } from '../../context/ToastContext';
import { formatIdr } from '../../lib/categories';
import { validateShippingFee } from '../../lib/shop';
import { AdminRow, FormSection, ListSkeleton } from '../_components/AdminParts';

interface AdminProduct {
  id: string;
  name: string;
  price_idr: number;
  stock: number;
  is_published: boolean;
  cover_image_url: string | null;
  created_at: string;
}

async function fetchProductsPage(page: number) {
  try {
    const res = await fetch(`/api/admin/products?page=${page}`);
    if (!res.ok) return null;
    return (await res.json()) as { products: AdminProduct[]; total: number; hasMore: boolean };
  } catch (error) {
    console.error('Error fetching products:', error);
    return null;
  }
}

/** The flat shipping fee every merchandise order pays. */
function ShippingFeeSetting() {
  const { showToast } = useToast();
  const [fee, setFee] = useState('');
  const [saved, setSaved] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch('/api/admin/shop-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (ignore || !data) return;
        setSaved(data.shippingFeeIdr);
        setFee(String(data.shippingFeeIdr));
      })
      .catch((err) => console.error('Error loading shop settings:', err));
    return () => {
      ignore = true;
    };
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = fee === '' ? 'Isi ongkos kirim, 0 untuk gratis.' : validateShippingFee(Number(fee));
    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/shop-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipping_fee_idr: Number(fee) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ongkos kirim gagal disimpan.');
        return;
      }
      setSaved(data.shippingFeeIdr);
      showToast({ type: 'success', message: 'Ongkos kirim disimpan.' });
    } catch (err) {
      console.error('Error saving shipping fee:', err);
      setError('Ongkos kirim gagal disimpan. Periksa koneksi Anda.');
    } finally {
      setSaving(false);
    }
  };

  const current = saved === null ? 'Memuat…' : saved > 0 ? `Sekarang ${formatIdr(saved)}` : 'Sekarang gratis ongkir';

  return (
    <FormSection title="Ongkos kirim" aside="Flat per pesanan. Pesanan yang sudah dibuat tetap memakai ongkir lamanya.">
      <form onSubmit={save} noValidate className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <TextField
          id="shipping-fee"
          label="Ongkos kirim (Rp)"
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="sm:max-w-xs sm:flex-grow"
          error={error}
          hint={current}
        />
        <Button type="submit" variant="secondary" loading={saving} disabled={fee !== '' && Number(fee) === saved} className="sm:mt-6">
          Simpan
        </Button>
      </form>
    </FormSection>
  );
}

export default function AdminProducts() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetchProductsPage(page).then((result) => {
      if (ignore) return;
      if (result) {
        setProducts((prev) => (page === 0 ? result.products : [...prev, ...result.products]));
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
      const res = await fetch(`/api/admin/products/${pendingDelete.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ type: 'error', message: data.error || 'Produk gagal dihapus.' });
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== pendingDelete.id));
      setTotal((prev) => Math.max(0, prev - 1));
      showToast({ type: 'success', message: 'Produk dihapus.' });
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast({ type: 'error', message: 'Produk gagal dihapus. Periksa koneksi Anda.' });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-10">
      <PageHeader
        eyebrow="Admin"
        title="Produk"
        description={loading ? 'Memuat…' : `${total} produk merchandise.`}
        actions={
          <>
            <Button variant="secondary" href="/shop">
              Lihat toko
            </Button>
            <Button href="/admin/products/create">Tambah produk</Button>
          </>
        }
      />

      <ShippingFeeSetting />

      <section className="grid gap-3" aria-labelledby="product-list">
        <h2 id="product-list" className="border-b border-ink pb-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em]">
          Daftar produk
        </h2>

        {loading ? (
          <ListSkeleton label="Memuat produk" />
        ) : failed && products.length === 0 ? (
          <EmptyState
            title="Produk gagal dimuat"
            description="Periksa koneksi Anda, lalu muat ulang halaman."
            action={
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Muat ulang
              </Button>
            }
          />
        ) : products.length === 0 ? (
          <EmptyState
            title="Belum ada produk"
            description="Tambahkan aksesori atau merchandise untuk membuka toko."
            action={<Button href="/admin/products/create">Tambah produk pertama</Button>}
          />
        ) : (
          <>
            <ul>
              {products.map((product) => (
                <AdminRow
                  key={product.id}
                  imageUrl={product.cover_image_url}
                  title={product.name}
                  tags={
                    <>
                      {product.stock <= 0 && <Tag variant="solid">Stok habis</Tag>}
                      {!product.is_published && <Tag variant="dashed">Disembunyikan</Tag>}
                      {!product.cover_image_url && <Tag variant="dashed">Tanpa foto</Tag>}
                    </>
                  }
                  meta={`${formatIdr(product.price_idr)} · ${product.stock <= 0 ? 'stok habis' : `${product.stock} di stok`}`}
                  actions={
                    <>
                      <Button variant="secondary" size="sm" href={`/admin/products/${product.id}/edit`}>
                        Ubah
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setPendingDelete(product)}>
                        Hapus
                      </Button>
                    </>
                  }
                />
              ))}
            </ul>

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="secondary"
                  loading={loadingMore}
                  onClick={() => {
                    setLoadingMore(true);
                    setPage((p) => p + 1);
                  }}
                >
                  Muat lebih banyak ({products.length}/{total})
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Hapus produk?"
        message={
          pendingDelete
            ? `"${pendingDelete.name}" beserta fotonya akan dihapus permanen. Catatan pesanan lama tetap tersimpan.`
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
