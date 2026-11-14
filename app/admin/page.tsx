'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button, Notice, PageHeader, cx, focusRing } from '../component/ui';
import { formatIdr } from '../lib/categories';
import { useAdmin } from './_components/AdminContext';

interface Stats {
  totalWorks: number;
  totalImages: number;
  soldWorks: number;
  totalProducts: number;
  ordersToShip: number;
  needsRefund: number;
  revenueIdr: number;
}

const SHORTCUTS = [
  { href: '/admin/works/create', title: 'Unggah karya baru', text: 'Album baru dengan sampai 6 gambar' },
  { href: '/admin/works', title: 'Kelola karya', text: 'Ubah karya, harga, dan status jual' },
  { href: '/admin/products', title: 'Produk', text: 'Merchandise, stok, foto, dan ongkos kirim' },
  { href: '/admin/orders', title: 'Pesanan dan penjualan', text: 'Kirim pesanan merchandise, lihat pembeli karya' },
];

export default function AdminDashboard() {
  const { user } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch('/api/admin/stats')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: Stats) => {
        if (!ignore) setStats(data);
      })
      .catch((err) => {
        console.error('Error fetching admin stats:', err);
        if (!ignore) setFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const figures: { label: string; value: string; sub: string }[] = stats
    ? [
        { label: 'Karya', value: String(stats.totalWorks), sub: `${stats.totalImages} gambar` },
        { label: 'Karya terjual', value: String(stats.soldWorks), sub: 'Satu pembeli per karya' },
        { label: 'Produk', value: String(stats.totalProducts), sub: 'Di toko' },
        { label: 'Perlu dikirim', value: String(stats.ordersToShip), sub: 'Pesanan lunas' },
        { label: 'Pendapatan', value: formatIdr(stats.revenueIdr), sub: 'Karya + merchandise lunas' },
      ]
    : [];

  return (
    <div className="grid grid-cols-1 gap-10">
      <PageHeader
        eyebrow="Admin"
        title="Ringkasan"
        description={<span className="[overflow-wrap:anywhere]">Masuk sebagai {user.email}</span>}
        actions={<Button href="/admin/works/create">Unggah karya</Button>}
      />

      {stats && stats.needsRefund > 0 && (
        <Notice
          tone="error"
          title={`${stats.needsRefund} pembayaran perlu dikembalikan`}
          action={
            <Button variant="secondary" size="sm" href="/admin/orders">
              Buka pesanan
            </Button>
          }
        >
          Uang masuk untuk karya yang sudah terjual, atau untuk merchandise yang stoknya habis. Kembalikan lewat dashboard
          Midtrans.
        </Notice>
      )}

      {failed ? (
        <Notice tone="error">Angka ringkasan gagal dimuat. Muat ulang halaman untuk mencoba lagi.</Notice>
      ) : (
        <dl className="grid grid-cols-2 border-l border-t border-line lg:grid-cols-5" aria-busy={!stats}>
          {(stats ? figures : Array.from({ length: 5 }, () => null)).map((fig, i) => (
            <div
              key={fig?.label ?? i}
              className={cx('grid min-w-0 content-start gap-1 border-b border-r border-line p-4', i === 4 && 'col-span-2 lg:col-span-1')}
            >
              {fig ? (
                <>
                  <dt className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-mute">{fig.label}</dt>
                  <dd className="truncate font-sans text-2xl font-bold tabular-nums tracking-[-0.02em] sm:text-3xl">{fig.value}</dd>
                  <dd className="font-sans text-xs text-mute">{fig.sub}</dd>
                </>
              ) : (
                <div className="h-16 animate-pulse bg-sheet" />
              )}
            </div>
          ))}
        </dl>
      )}

      <section className="grid gap-3" aria-labelledby="admin-shortcuts">
        <h2 id="admin-shortcuts" className="border-b border-ink pb-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em]">
          Kelola
        </h2>
        <ul className="grid md:grid-cols-2">
          {SHORTCUTS.map((s) => (
            <li key={s.href} className="border-b border-line">
              <Link
                href={s.href}
                className={cx('group flex min-h-16 items-center justify-between gap-4 py-4 pr-2 hover:bg-sheet md:px-3', focusRing)}
              >
                <span className="grid gap-0.5">
                  <span className="font-sans text-sm font-bold uppercase tracking-[0.08em]">{s.title}</span>
                  <span className="font-sans text-xs text-mute">{s.text}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3" aria-labelledby="how-selling-works">
        <h2 id="how-selling-works" className="border-b border-ink pb-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em]">
          Cara penjualan bekerja
        </h2>
        <ul className="grid max-w-prose list-disc gap-2 pl-5 font-sans text-sm leading-relaxed text-ink marker:text-mute">
          <li>Semua gambar karya yang dipublikasikan bisa dilihat siapa saja, tanpa blur.</li>
          <li>
            Karya yang dijual hanya untuk <strong>satu pembeli</strong>. Selama seseorang membayar, karya ditahan untuknya
            30 menit; setelah lunas karya tampil <em>Terjual</em> dan tidak bisa dibeli atau diunduh orang lain.
          </li>
          <li>Pembeli mengunduh file asli resolusi penuh sebagai JPG, ZIP, PDF, atau ke Google Drive.</li>
          <li>
            Merchandise dibeli langsung dengan ongkos kirim flat. Stok ditahan selama pembayaran dan kembali otomatis bila
            pembayaran tidak selesai.
          </li>
        </ul>
      </section>
    </div>
  );
}
