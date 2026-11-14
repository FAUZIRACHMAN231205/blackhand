'use client';

import { useCallback, useEffect, useState } from 'react';
import ConfirmDialog from '../../component/ConfirmDialog';
import { Button, EmptyState, FilterTabs, Notice, PageHeader, Tag, TextField, type TagVariant } from '../../component/ui';
import { useToast } from '../../context/ToastContext';
import { formatIdr } from '../../lib/categories';
import {
  FULFILLMENT_LABELS,
  PAYMENT_STATUS_LABELS,
  allowedFulfillmentActions,
  type FulfillmentAction,
  type FulfillmentStatus,
  type PaymentStatus,
} from '../../lib/shop';
import { ListSkeleton } from '../_components/AdminParts';

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

type Section = 'merch' | 'sales';
type MerchView = 'todo' | 'shipped' | 'done' | 'unpaid';
type SaleView = 'sold' | 'refund' | 'pending' | 'history';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'merch', label: 'Merchandise' },
  { value: 'sales', label: 'Penjualan karya' },
];

const MERCH_VIEWS: { value: MerchView; label: string }[] = [
  { value: 'todo', label: 'Perlu diproses' },
  { value: 'shipped', label: 'Dikirim' },
  { value: 'done', label: 'Selesai' },
  { value: 'unpaid', label: 'Belum dibayar' },
];

const SALE_VIEWS: { value: SaleView; label: string }[] = [
  { value: 'sold', label: 'Terjual' },
  { value: 'refund', label: 'Perlu refund' },
  { value: 'pending', label: 'Sedang checkout' },
  { value: 'history', label: 'Riwayat' },
];

const ACTION_LABELS: Record<FulfillmentAction, string> = {
  process: 'Mulai proses',
  ship: 'Tandai dikirim',
  complete: 'Tandai selesai',
  cancel: 'Batalkan pesanan',
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

/** Status by shape: solid needs the admin, dashed is waiting, outline is settled. */
function statusVariant(status: PaymentStatus, fulfillment?: FulfillmentStatus): TagVariant {
  if (status === 'needs_refund') return 'solid';
  if (status === 'pending') return 'dashed';
  if (status === 'paid' && fulfillment === 'unfulfilled') return 'solid';
  return 'outline';
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-mute">{children}</p>;
}

/** A paginated list from one of the admin order endpoints. */
function usePagedList<T>(url: string | null, key: 'orders' | 'sales') {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);

  // A new list (tab switch) starts from its first page.
  const [prevUrl, setPrevUrl] = useState(url);
  if (url !== prevUrl) {
    setPrevUrl(url);
    setPage(0);
    setItems([]);
    setLoading(true);
    setFailed(false);
  }

  useEffect(() => {
    if (!url) return;
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`${url}&page=${page}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (ignore) return;
        setItems((prev) => (page === 0 ? data[key] : [...prev, ...data[key]]));
        setTotal(data.total);
        setHasMore(data.hasMore);
        setFailed(false);
      } catch (err) {
        console.error('Error loading list:', err);
        if (!ignore) setFailed(true);
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

  return { items, total, hasMore, loading, failed, loadMore: () => setPage((p) => p + 1), reload };
}

function MerchOrderCard({ order, onChanged }: { order: MerchOrder; onChanged: () => void }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [shipError, setShipError] = useState<string | null>(null);
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
        if (action === 'ship') setShipError(data.error || 'Pesanan gagal diperbarui.');
        else showToast({ type: 'error', message: data.error || 'Pesanan gagal diperbarui.' });
        return;
      }
      const stage = FULFILLMENT_LABELS[data.fulfillment_status as FulfillmentStatus];
      showToast({ type: 'success', message: stage ? `Pesanan: ${stage.toLowerCase()}.` : 'Pesanan diperbarui.' });
      setShipping(false);
      onChanged();
    } catch (err) {
      console.error('Order update error:', err);
      showToast({ type: 'error', message: 'Pesanan gagal diperbarui. Periksa koneksi Anda.' });
    } finally {
      setBusy(false);
      setConfirmCancel(false);
    }
  };

  const label = order.status === 'paid' ? FULFILLMENT_LABELS[order.fulfillment_status] : PAYMENT_STATUS_LABELS[order.status];

  return (
    <li className="grid gap-4 border-b border-line py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h3 className="font-serif text-lg italic leading-tight">
            {order.product_name} <span className="font-sans text-sm not-italic text-mute">× {order.quantity}</span>
          </h3>
          <p className="font-sans text-xs text-mute">
            {formatIdr(order.total_idr)} (termasuk ongkir {formatIdr(order.shipping_fee_idr)}) · {formatDateTime(order.created_at)}
          </p>
        </div>
        <Tag variant={statusVariant(order.status, order.fulfillment_status)}>{label}</Tag>
      </div>

      <div className="grid gap-4 font-sans text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <Label>Kirim ke</Label>
          <p className="font-semibold">
            {order.recipient_name} · <span className="select-all">{order.recipient_phone}</span>
          </p>
          <p className="select-all text-mute">
            {order.shipping_address}, {order.shipping_city} {order.shipping_postal_code}
          </p>
          {order.notes && <p className="mt-1 italic text-mute">“{order.notes}”</p>}
        </div>
        <div className="min-w-0">
          <Label>Pembeli</Label>
          <p>{order.users?.full_name || '—'}</p>
          <p className="break-all text-mute">{order.users?.email}</p>
          <p className="mt-1 break-all font-mono text-[11px] text-mute">
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
        <Notice tone="error">Sudah dibayar, tetapi stok habis. Kembalikan pembayaran ini lewat dashboard Midtrans.</Notice>
      )}

      {shipping ? (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!courier.trim() || !tracking.trim()) {
              setShipError('Isi kurir dan nomor resi.');
              return;
            }
            setShipError(null);
            run('ship', { courier: courier.trim(), tracking_number: tracking.trim() });
          }}
          className="grid gap-4 border-t border-line pt-4"
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_1.5fr]">
            <TextField
              id={`courier-${order.id}`}
              label="Kurir"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              placeholder="Contoh: JNE"
            />
            <TextField
              id={`tracking-${order.id}`}
              label="Nomor resi"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              error={shipError}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" loading={busy}>
              Simpan resi
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShipping(false)} disabled={busy}>
              Batal
            </Button>
          </div>
        </form>
      ) : (
        actions.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {actions.map((action) => (
              <Button
                key={action}
                size="sm"
                variant={action === 'cancel' ? 'danger' : action === 'ship' ? 'primary' : 'secondary'}
                disabled={busy}
                onClick={() => {
                  if (action === 'ship') setShipping(true);
                  else if (action === 'cancel') setConfirmCancel(true);
                  else run(action);
                }}
              >
                {ACTION_LABELS[action]}
              </Button>
            ))}
          </div>
        )
      )}

      <ConfirmDialog
        isOpen={confirmCancel}
        title="Batalkan pesanan?"
        message={`${order.quantity} barang kembali ke stok. Kembalikan ${formatIdr(order.total_idr)} ke pembeli lewat dashboard Midtrans.`}
        confirmLabel="Batalkan pesanan"
        cancelLabel="Jangan"
        loading={busy}
        onConfirm={() => run('cancel')}
        onCancel={() => setConfirmCancel(false)}
      />
    </li>
  );
}

function SaleRow({ sale }: { sale: WorkSale }) {
  return (
    <li className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid min-w-0 gap-1">
        <h3 className="font-serif text-lg italic leading-tight">{sale.work_title}</h3>
        <p className="break-all font-sans text-xs text-mute">
          {sale.users?.full_name ? `${sale.users.full_name} · ` : ''}
          {sale.users?.email ?? 'Pembeli tidak diketahui'}
        </p>
        <p className="break-all font-mono text-[11px] text-mute">
          {sale.provider_order_id}
          {sale.payment_type ? ` · ${sale.payment_type}` : ''}
        </p>
      </div>
      <div className="grid shrink-0 justify-items-start gap-1 sm:justify-items-end">
        <p className="font-sans text-sm font-bold tabular-nums">{formatIdr(sale.amount_idr)}</p>
        <p className="font-sans text-xs text-mute">
          {sale.status === 'pending' && sale.expires_at
            ? `Ditahan sampai ${formatDateTime(sale.expires_at)}`
            : formatDateTime(sale.paid_at ?? sale.created_at)}
        </p>
        <Tag variant={statusVariant(sale.status, 'completed')}>{PAYMENT_STATUS_LABELS[sale.status]}</Tag>
      </div>
    </li>
  );
}

export default function AdminOrders() {
  const [section, setSection] = useState<Section>('merch');
  const [merchView, setMerchView] = useState<MerchView>('todo');
  const [saleView, setSaleView] = useState<SaleView>('sold');

  const merch = usePagedList<MerchOrder>(section === 'merch' ? `/api/admin/product-orders?view=${merchView}` : null, 'orders');
  const sales = usePagedList<WorkSale>(section === 'sales' ? `/api/admin/sales?view=${saleView}` : null, 'sales');
  const list = section === 'merch' ? merch : sales;

  return (
    <div className="grid grid-cols-1 gap-8">
      <PageHeader
        eyebrow="Admin"
        title="Pesanan"
        description="Kirim pesanan merchandise dan lihat siapa pembeli setiap karya."
      />

      <div className="grid gap-2">
        <FilterTabs label="Jenis pesanan" items={SECTIONS} value={section} onChange={setSection} />
        {section === 'merch' ? (
          <FilterTabs label="Status merchandise" items={MERCH_VIEWS} value={merchView} onChange={setMerchView} />
        ) : (
          <FilterTabs label="Status penjualan karya" items={SALE_VIEWS} value={saleView} onChange={setSaleView} />
        )}
      </div>

      {list.loading ? (
        <ListSkeleton label="Memuat pesanan" />
      ) : list.failed && list.items.length === 0 ? (
        <EmptyState
          title="Pesanan gagal dimuat"
          description="Periksa koneksi Anda, lalu muat ulang halaman."
          action={
            <Button variant="secondary" onClick={list.reload}>
              Coba lagi
            </Button>
          }
        />
      ) : list.items.length === 0 ? (
        <EmptyState title="Tidak ada pesanan di sini" description="Pesanan dengan status ini akan muncul di daftar ini." />
      ) : (
        <>
          <ul className="border-t border-line">
            {section === 'merch'
              ? merch.items.map((order) => <MerchOrderCard key={order.id} order={order} onChanged={merch.reload} />)
              : sales.items.map((sale) => <SaleRow key={sale.id} sale={sale} />)}
          </ul>

          {list.hasMore && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={list.loadMore}>
                Muat lebih banyak ({list.items.length}/{list.total})
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
