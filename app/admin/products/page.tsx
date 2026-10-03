'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, ChevronLeft, ShoppingBag, ChevronDown, Loader2, Truck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../lib/adminUtils';
import { formatIdr } from '../../lib/categories';
import { useToast } from '../../context/ToastContext';
import Navbar from '../../component/Navbar';
import { LoadingSpinner } from '../../component/LoadingStates';
import ConfirmDialog from '../../component/ConfirmDialog';
import { adminInputClass } from '../../component/ProductFields';

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
    if (!res.ok) return { products: [] as AdminProduct[], total: 0, hasMore: false };
    return (await res.json()) as { products: AdminProduct[]; total: number; hasMore: boolean };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { products: [] as AdminProduct[], total: 0, hasMore: false };
  }
}

/** The flat shipping fee every merchandise order pays. */
function ShippingFeeSetting() {
  const { showToast } = useToast();
  const [fee, setFee] = useState('');
  const [saved, setSaved] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      const res = await fetch('/api/admin/shop-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipping_fee_idr: fee === '' ? null : Number(fee) }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ type: 'error', message: data.error || 'Failed to save shipping fee' });
        return;
      }
      setSaved(data.shippingFeeIdr);
      showToast({ type: 'success', message: 'Shipping fee updated' });
    } catch (err) {
      console.error('Error saving shipping fee:', err);
      showToast({ type: 'error', message: 'Failed to save shipping fee' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={save}
      className="mb-10 flex flex-col gap-4 rounded-2xl border border-black/5 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950/60 sm:flex-row sm:items-end"
    >
      <div className="flex-grow">
        <label htmlFor="shipping-fee" className="mb-2.5 flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50">
          <Truck size={14} /> Flat shipping fee per order (IDR)
        </label>
        <input
          id="shipping-fee"
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className={adminInputClass}
        />
        <p className="mt-1.5 font-sans text-[11px] text-black/60 dark:text-white/60">
          {saved === null ? 'Loading…' : saved > 0 ? `Currently ${formatIdr(saved)}` : 'Currently free shipping'} ·
          orders already placed keep the fee they were quoted.
        </p>
      </div>
      <button
        type="submit"
        disabled={saving || fee === '' || Number(fee) === saved}
        className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-black px-6 font-sans text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:opacity-90 disabled:opacity-40 dark:bg-white dark:text-black sm:mb-[26px]"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        Save
      </button>
    </form>
  );
}

export default function AdminProducts() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/');
      else if (!isAdmin(user)) router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !isAdmin(user)) return;
    let ignore = false;
    fetchProductsPage(page).then((result) => {
      if (ignore) return;
      setProducts((prev) => (page === 0 ? result.products : [...prev, ...result.products]));
      setTotal(result.total);
      setHasMore(result.hasMore);
      setLoadingList(false);
      setLoadingMore(false);
    });
    return () => {
      ignore = true;
    };
  }, [user, page]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${pendingDelete.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ type: 'error', message: data.error || 'Failed to delete product' });
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== pendingDelete.id));
      setTotal((prev) => Math.max(0, prev - 1));
      showToast({ type: 'success', message: 'Product deleted' });
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast({ type: 'error', message: 'Failed to delete product' });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!user || !isAdmin(user)) return null;

  return (
    <>
      <Navbar onOpenModal={() => {}} />

      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-6 md:p-20 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 py-2 mb-6 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-sans text-sm font-medium">Back to Admin</span>
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-10">
            <div>
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl italic font-medium mb-2">Products</h1>
              <p className="font-sans text-sm text-black/60 dark:text-white/60">
                Total: <span className="text-black dark:text-white font-medium">{total}</span> products ·{' '}
                <Link href="/shop" className="underline underline-offset-2 hover:text-violet-600">
                  view shop
                </Link>
              </p>
            </div>
            <Link
              href="/admin/products/create"
              className="self-start sm:self-auto flex items-center gap-2 px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-all font-sans text-[11px] font-black uppercase tracking-[0.2em]"
            >
              <Plus size={16} />
              <span>New Product</span>
            </Link>
          </div>

          <ShippingFeeSetting />

          {loadingList ? (
            <p className="py-16 text-center font-sans text-sm text-black/50 dark:text-white/50 animate-pulse">Loading products...</p>
          ) : products.length === 0 ? (
            <div className="bg-white/80 dark:bg-zinc-950/60 border border-dashed border-black/10 dark:border-white/15 rounded-2xl p-12 text-center">
              <ShoppingBag size={28} strokeWidth={1.25} className="mx-auto mb-4 opacity-40" />
              <h2 className="font-serif text-2xl italic mb-2">No Products Yet</h2>
              <p className="font-sans text-sm text-black/60 dark:text-white/60 mb-6">Add accessories or merchandise to open the shop.</p>
              <Link
                href="/admin/products/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-all font-sans text-[11px] font-black uppercase tracking-[0.2em]"
              >
                <Plus size={14} /> Add First Product
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm transition-all hover:border-violet-500/30 dark:border-white/10 dark:bg-zinc-950/60"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
                    {product.cover_image_url ? (
                      <img src={product.cover_image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag size={20} strokeWidth={1.25} className="opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-serif text-lg italic truncate">{product.name}</h3>
                      {!product.is_published && (
                        <span className="px-2 py-0.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full font-sans text-[9px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                          Hidden
                        </span>
                      )}
                      {!product.cover_image_url && (
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full font-sans text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                          No photo
                        </span>
                      )}
                    </div>
                    <p className="font-sans text-xs text-black/60 dark:text-white/60">
                      {formatIdr(product.price_idr)} ·{' '}
                      <span className={product.stock <= 0 ? 'font-bold text-rose-600 dark:text-rose-400' : ''}>
                        {product.stock <= 0 ? 'Out of stock' : `${product.stock} in stock`}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link href={`/admin/products/${product.id}/edit`} className="p-2.5 hover:bg-violet-500/10 rounded-xl transition-colors" title="Edit">
                      <Edit2 size={16} strokeWidth={1.5} className="text-black/60 dark:text-white/60" />
                    </Link>
                    <button onClick={() => setPendingDelete(product)} className="p-2.5 hover:bg-rose-500/10 rounded-xl transition-colors" title="Delete">
                      <Trash2 size={16} strokeWidth={1.5} className="text-rose-500/80 dark:text-rose-400/80" />
                    </button>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="flex justify-center pt-6">
                  <button
                    onClick={() => {
                      setLoadingMore(true);
                      setPage((prev) => prev + 1);
                    }}
                    disabled={loadingMore}
                    className="flex min-h-[48px] items-center gap-2 rounded-xl border border-black/10 bg-black/[0.03] px-8 font-sans text-[11px] font-black uppercase tracking-[0.2em] transition-colors hover:bg-black/5 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/10"
                  >
                    {loadingMore ? <Loader2 size={15} className="animate-spin" /> : <ChevronDown size={15} />}
                    {loadingMore ? 'Loading...' : `Load more (${products.length}/${total})`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete product?"
        message={pendingDelete ? `"${pendingDelete.name}" and its photos will be removed. Past orders keep their record.` : ''}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
