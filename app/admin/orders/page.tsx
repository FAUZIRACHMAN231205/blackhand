'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronDown, Loader2, Package, Receipt, Truck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { isAdmin } from '../../lib/adminUtils';
import { formatIdr } from '../../lib/categories';
import { useToast } from '../../context/ToastContext';
import {
  FULFILLMENT_LABELS,
  PAYMENT_STATUS_LABELS,
  allowedFulfillmentActions,
  type FulfillmentAction,
  type FulfillmentStatus,
  type PaymentStatus,
} from '../../lib/shop';
import Navbar from '../../component/Navbar';
import { LoadingSpinner } from '../../component/LoadingStates';
import ConfirmDialog from '../../component/ConfirmDialog';
import { adminInputClass } from '../../component/ProductFields';

interface Buyer {
  email: string;
  full_name: string | null;
}

interface MerchOrder {
  id: string;
  product_name: string;
  quantity: number;
  subtotal_idr: number;
  shipping_fee_idr: number;
  total_idr: number;
  status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  notes: string;
  courier: string | null;
  tracking_number: string | null;
  provider_order_id: string;
  payment_type: string | null;
  created_at: string;
  paid_at: string | null;
  users: Buyer | null;
}

interface WorkSale {
  id: string;
  work_id: string;
  work_title: string;
  amount_idr: number;
  status: PaymentStatus;
  provider_order_id: string;
  payment_type: string | null;
  created_at: string;
  paid_at: string | null;
  expires_at: string | null;
  users: Buyer | null;
}

const MERCH_VIEWS = [
  { key: 'todo', label: 'To do' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'done', label: 'Done' },
  { key: 'unpaid', label: 'Unpaid' },
] as const;

const SALE_VIEWS = [
  { key: 'sold', label: 'Sold' },
  { key: 'refund', label: 'Needs refund' },
  { key: 'pending', label: 'In checkout' },
  { key: 'history', label: 'History' },
] as const;

const ACTION_LABELS: Record<FulfillmentAction, string> = {
  process: 'Start processing',
  ship: 'Mark shipped',
  complete: 'Mark completed',
  cancel: 'Cancel order',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusTone(status: PaymentStatus, fulfillment?: FulfillmentStatus) {
  if (status === 'needs_refund') return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30';
  if (status !== 'paid') return 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60 border-black/10 dark:border-white/10';
  if (fulfillment === 'unfulfilled') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
  if (fulfillment === 'cancelled') return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30';
  return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
}

function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    // Swipe sideways on phones; overflow-y-hidden stops the active tab's 1px
    // underline from making the row scroll vertically too.
    <div className="hide-scrollbar mb-6 flex gap-x-6 overflow-x-auto overflow-y-hidden border-b border-black/10 dark:border-white/10">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`relative shrink-0 py-3 font-sans text-xs font-bold uppercase tracking-[0.15em] transition-colors ${
            value === tab.key ? 'text-black dark:text-white' : 'text-black/50 hover:text-black/70 dark:text-white/50 dark:hover:text-white/70'
          }`}
        >
          {tab.label}
          {value === tab.key && <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-violet-500" />}
        </button>
      ))}
    </div>
  );
}

/** A paginated list from one of the admin order endpoints. */
function usePagedList<T>(url: string | null, key: 'orders' | 'sales') {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  // A new list (tab switch) starts from its first page.
  const [prevUrl, setPrevUrl] = useState(url);
  if (url !== prevUrl) {
    setPrevUrl(url);
    setPage(0);
    setItems([]);
    setLoading(true);
  }

  useEffect(() => {
    if (!url) return;
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`${url}&page=${page}`);
        const data = res.ok ? await res.json() : { [key]: [], total: 0, hasMore: false };
        if (ignore) return;
        setItems((prev) => (page === 0 ? data[key] : [...prev, ...data[key]]));
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch (err) {
        console.error('Error loading list:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [url, page, key, version]);

  const reload = useCallback(() => {
    setPage(0);
    setVersion((v) => v + 1);
  }, []);

  return { items, total, hasMore, loading, loadMore: () => setPage((p) => p + 1), reload };
}

function MerchOrderCard({ order, onChanged }: { order: MerchOrder; onChanged: () => void }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const actions = allowedFulfillmentActions(order.status, order.fulfillment_status);

  const run = async (action: FulfillmentAction, extra: Record<string, string> = {}) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/product-orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ type: 'error', message: data.error || 'Failed to update order' });
        return;
      }
      showToast({ type: 'success', message: `Order ${FULFILLMENT_LABELS[data.fulfillment_status as FulfillmentStatus]?.toLowerCase() ?? 'updated'}` });
      setShipping(false);
      onChanged();
    } catch (err) {
      console.error('Order update error:', err);
      showToast({ type: 'error', message: 'Failed to update order' });
    } finally {
      setBusy(false);
      setConfirmCancel(false);
    }
  };

  const label =
    order.status === 'paid' ? FULFILLMENT_LABELS[order.fulfillment_status] : PAYMENT_STATUS_LABELS[order.status];

  return (
    <article className="rounded-2xl border border-black/5 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-lg italic">
            {order.product_name} <span className="font-sans text-sm not-italic text-black/60 dark:text-white/60">× {order.quantity}</span>
          </h3>
          <p className="font-sans text-xs text-black/55 dark:text-white/55">
            {formatIdr(order.total_idr)} (incl. {formatIdr(order.shipping_fee_idr)} shipping) · {formatDateTime(order.created_at)}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-wider ${statusTone(order.status, order.fulfillment_status)}`}>
          {label}
        </span>
      </div>

      <div className="mt-4 grid gap-4 font-sans text-xs sm:grid-cols-2">
        <div>
          <p className="mb-1 font-bold uppercase tracking-wider text-[10px] text-black/45 dark:text-white/45">Ship to</p>
          <p className="font-semibold">{order.recipient_name} · <span className="select-all">{order.recipient_phone}</span></p>
          <p className="select-all text-black/70 dark:text-white/70">
            {order.shipping_address}, {order.shipping_city} {order.shipping_postal_code}
          </p>
          {order.notes && <p className="mt-1 italic text-black/60 dark:text-white/60">“{order.notes}”</p>}
        </div>
        <div>
          <p className="mb-1 font-bold uppercase tracking-wider text-[10px] text-black/45 dark:text-white/45">Buyer</p>
          <p>{order.users?.full_name || '—'}</p>
          <p className="break-all text-black/70 dark:text-white/70">{order.users?.email}</p>
          <p className="mt-1 break-all font-mono text-[10px] text-black/45 dark:text-white/45">
            {order.provider_order_id}
            {order.payment_type ? ` · ${order.payment_type}` : ''}
          </p>
          {order.tracking_number && (
            <p className="mt-1">
              {order.courier}: <span className="select-all break-all font-mono font-bold">{order.tracking_number}</span>
            </p>
          )}
        </div>
      </div>

      {order.status === 'needs_refund' && (
        <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 font-sans text-xs text-rose-700 dark:text-rose-300">
          Paid, but the stock had run out. Refund this payment in the Midtrans dashboard.
        </p>
      )}

      {shipping ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run('ship', { courier, tracking_number: tracking });
          }}
          className="mt-4 grid gap-3 border-t border-black/5 pt-4 dark:border-white/10 sm:grid-cols-[1fr_1.5fr_auto_auto]"
        >
          <input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Courier (e.g. JNE)" aria-label="Courier" className={adminInputClass} />
          <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" aria-label="Tracking number" className={adminInputClass} />
          <button type="submit" disabled={busy} className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-black px-5 font-sans text-[11px] font-black uppercase tracking-[0.15em] text-white disabled:opacity-50 dark:bg-white dark:text-black">
            {busy && <Loader2 size={13} className="animate-spin" />} Save
          </button>
          <button type="button" onClick={() => setShipping(false)} className="min-h-[48px] rounded-xl border border-black/10 px-5 font-sans text-[11px] font-black uppercase tracking-[0.15em] dark:border-white/10">
            Cancel
          </button>
        </form>
      ) : (
        actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-black/5 pt-4 dark:border-white/10">
            {actions.map((action) => (
              <button
                key={action}
                disabled={busy}
                onClick={() => {
                  if (action === 'ship') setShipping(true);
                  else if (action === 'cancel') setConfirmCancel(true);
                  else run(action);
                }}
                className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 font-sans text-[11px] font-bold transition-colors disabled:opacity-50 ${
                  action === 'cancel'
                    ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400'
                    : action === 'ship'
                      ? 'bg-violet-600 text-white hover:bg-violet-700'
                      : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
                }`}
              >
                {action === 'ship' && <Truck size={14} />}
                {ACTION_LABELS[action]}
              </button>
            ))}
          </div>
        )
      )}

      <ConfirmDialog
        isOpen={confirmCancel}
        title="Cancel this order?"
        message={`${order.quantity} unit(s) go back into stock. Refund ${formatIdr(order.total_idr)} to the buyer in the Midtrans dashboard.`}
        confirmLabel="Cancel order"
        loading={busy}
        onConfirm={() => run('cancel')}
        onCancel={() => setConfirmCancel(false)}
      />
    </article>
  );
}

function SaleRow({ sale }: { sale: WorkSale }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950/60 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="font-serif text-lg italic">{sale.work_title}</h3>
        <p className="font-sans text-xs text-black/60 dark:text-white/60">
          {sale.users?.full_name ? `${sale.users.full_name} · ` : ''}
          {sale.users?.email ?? 'Unknown buyer'}
        </p>
        <p className="mt-0.5 break-all font-mono text-[10px] text-black/45 dark:text-white/45">
          {sale.provider_order_id}
          {sale.payment_type ? ` · ${sale.payment_type}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-left sm:text-right">
        <p className="font-sans text-sm font-black">{formatIdr(sale.amount_idr)}</p>
        <p className="font-sans text-[11px] text-black/55 dark:text-white/55">
          {sale.status === 'pending' && sale.expires_at
            ? `Held until ${formatDateTime(sale.expires_at)}`
            : formatDateTime(sale.paid_at ?? sale.created_at)}
        </p>
        <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider ${statusTone(sale.status, 'completed')}`}>
          {PAYMENT_STATUS_LABELS[sale.status]}
        </span>
      </div>
    </article>
  );
}

export default function AdminOrders() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<'merch' | 'sales'>('merch');
  const [merchView, setMerchView] = useState<(typeof MERCH_VIEWS)[number]['key']>('todo');
  const [saleView, setSaleView] = useState<(typeof SALE_VIEWS)[number]['key']>('sold');

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/');
      else if (!isAdmin(user)) router.push('/dashboard');
    }
  }, [user, loading, router]);

  const ready = Boolean(user && isAdmin(user));
  const merch = usePagedList<MerchOrder>(
    ready && section === 'merch' ? `/api/admin/product-orders?view=${merchView}` : null,
    'orders'
  );
  const sales = usePagedList<WorkSale>(
    ready && section === 'sales' ? `/api/admin/sales?view=${saleView}` : null,
    'sales'
  );

  if (loading) return <LoadingSpinner />;
  if (!ready) return null;

  const list = section === 'merch' ? merch : sales;

  return (
    <>
      <Navbar onOpenModal={() => {}} />

      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-6 md:p-20 transition-colors duration-300">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 py-2 mb-6 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-sans text-sm font-medium">Back to Admin</span>
          </button>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl italic font-medium mb-8">Orders &amp; Sales</h1>

          {/* Full-width halves on phones, so neither label gets squeezed onto two lines. */}
          <div className="mb-8 grid w-full grid-cols-2 rounded-xl border border-black/10 p-1 dark:border-white/10 sm:inline-flex sm:w-auto">
            {[
              { key: 'merch' as const, label: 'Merchandise', icon: Package },
              { key: 'sales' as const, label: 'Artwork sales', icon: Receipt },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 font-sans text-xs font-bold whitespace-nowrap transition-colors sm:px-4 ${
                  section === item.key ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5'
                }`}
              >
                <item.icon size={14} className="shrink-0" /> {item.label}
              </button>
            ))}
          </div>

          {section === 'merch' ? (
            <Tabs tabs={MERCH_VIEWS} value={merchView} onChange={setMerchView} />
          ) : (
            <Tabs tabs={SALE_VIEWS} value={saleView} onChange={setSaleView} />
          )}

          {list.loading ? (
            <p className="py-16 text-center font-sans text-sm text-black/50 dark:text-white/50 animate-pulse">Loading…</p>
          ) : list.items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-black/10 p-12 text-center font-sans text-sm text-black/55 dark:border-white/15 dark:text-white/55">
              Nothing here.
            </p>
          ) : (
            <div className="space-y-4">
              {section === 'merch'
                ? merch.items.map((order) => <MerchOrderCard key={order.id} order={order} onChanged={merch.reload} />)
                : sales.items.map((sale) => <SaleRow key={sale.id} sale={sale} />)}

              {list.hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={list.loadMore}
                    className="flex min-h-[48px] items-center gap-2 rounded-xl border border-black/10 bg-black/[0.03] px-8 font-sans text-[11px] font-black uppercase tracking-[0.2em] transition-colors hover:bg-black/5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/10"
                  >
                    <ChevronDown size={15} /> Load more ({list.items.length}/{list.total})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
