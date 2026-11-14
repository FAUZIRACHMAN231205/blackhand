import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Clock, Check } from 'lucide-react';
import { Button, CatalogCard, EmptyState, Notice, PageHeader, Price, TabLinks, Tag } from '../component/ui';
import { DemoFields, DemoFilterTabs, DemoImageViewer, DemoQuantity, DemoToasts, ThemeSwitch } from './Demos';

export const metadata: Metadata = {
  title: 'UI Kit',
  robots: { index: false, follow: false },
};

/**
 * Development-only gallery of the UI kit, rendered from the real components so
 * it can be checked against the approved design book. Not part of the site.
 */
export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="min-h-[100dvh] bg-paper px-4 pb-24 pt-10 font-sans text-ink sm:px-8">
      <div className="mx-auto grid max-w-5xl gap-16">
        <PageHeader
          eyebrow="Tahap 1 · Fondasi"
          title="UI Kit"
          description="Komponen sungguhan dari app/component/ui, dirender langsung. Bandingkan dengan Buku Desain Blackhand."
          actions={<ThemeSwitch />}
        />

        <Section title="Tombol">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="buy">Beli karya ini</Button>
            <Button variant="primary">Lihat semua karya</Button>
            <Button variant="secondary">Muat lebih banyak</Button>
            <Button variant="ghost">Batal</Button>
            <Button variant="danger">Hapus</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="buy" loading>
              Menyiapkan
            </Button>
            <Button variant="primary" disabled>
              Tidak tersedia
            </Button>
            <Button variant="secondary" size="sm" href="/gallery">
              Tautan kecil
            </Button>
          </div>
          <div className="max-w-sm">
            <Button variant="buy" fullWidth>
              Bayar · Rp 77.000
            </Button>
          </div>
        </Section>

        <Section title="Label status">
          <div className="flex flex-wrap items-center gap-2">
            <Tag variant="solid">Terjual</Tag>
            <Tag icon={<Check size={11} aria-hidden />}>Milik Anda</Tag>
            <Tag variant="dashed" icon={<Clock size={11} aria-hidden />}>
              Sedang dibeli
            </Tag>
            <Tag variant="sale">−25%</Tag>
            <Tag>Baru</Tag>
            <Tag variant="solid">Stok habis</Tag>
            <Tag>Pilihan</Tag>
          </div>
        </Section>

        <Section title="Harga">
          <div className="flex flex-wrap items-baseline gap-8">
            <Price amount={15000} size="sm" />
            <Price amount={75000} compareAt={100000} />
            <Price amount={15000} size="lg" />
          </div>
        </Section>

        <Section title="Kartu karya dan produk">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            <CatalogCard href="#" imageUrl={null} title="Zidan Anyun" meta="Paintings" aside={<Price amount={15000} size="sm" />} />
            <CatalogCard
              href="#"
              imageUrl={null}
              title="Irreplaceable"
              meta="Paintings"
              aside="Terjual"
              tags={<Tag variant="solid">Terjual</Tag>}
            />
            <CatalogCard
              href="#"
              imageUrl={null}
              title="Tote Bag Blackhand"
              meta="Merchandise"
              aside={<Price amount={75000} compareAt={100000} size="sm" />}
              tags={<Tag variant="sale">−25%</Tag>}
            />
            <CatalogCard
              href="#"
              imageUrl={null}
              title="Kaos Hitam Edisi 01 dengan Nama yang Panjang Sekali"
              meta="Merchandise"
              aside={<Price amount={150000} size="sm" />}
              tags={<Tag variant="solid">Stok habis</Tag>}
              dimmed
            />
          </div>
        </Section>

        <Section title="Filter">
          <DemoFilterTabs />
        </Section>

        <Section title="Tab halaman">
          <TabLinks
            label="Contoh tab akun"
            current="/design"
            items={[
              { href: '/design', label: 'Koleksi' },
              { href: '/account/orders', label: 'Pesanan' },
              { href: '/account/profile', label: 'Profil' },
            ]}
          />
        </Section>

        <Section title="Isian">
          <DemoFields />
        </Section>

        <Section title="Pemberitahuan">
          <div className="grid max-w-md gap-3">
            <Notice title="Milik Anda">Anda satu-satunya pemilik karya ini. Unduh 6 file resolusi penuh kapan saja.</Notice>
            <Notice tone="pending" title="Sedang dibeli">
              Pengunjung lain sedang membayar karya ini sampai pukul 14.35 WIB.
            </Notice>
            <Notice tone="error">Komentar gagal dikirim. Periksa koneksi Anda lalu coba lagi.</Notice>
          </div>
        </Section>

        <Section title="Notifikasi">
          <DemoToasts />
        </Section>

        <Section title="Jumlah">
          <DemoQuantity />
        </Section>

        <Section title="Penampil gambar">
          <DemoImageViewer />
        </Section>

        <Section title="Keadaan kosong">
          <EmptyState
            title="Belum ada pesanan"
            description="Pesanan merchandise Anda akan muncul di sini beserta nomor resinya."
            action={
              <Button variant="secondary" href="/shop">
                Lihat toko
              </Button>
            }
          />
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5">
      <h2 className="border-t border-ink pt-3 text-[11px] font-bold uppercase tracking-[0.2em]">{title}</h2>
      {children}
    </section>
  );
}
