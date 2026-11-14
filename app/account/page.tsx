'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExternalLink, ImageOff, X } from 'lucide-react';
import AlbumDownloads from '../component/AlbumDownloads';
import { Button, EmptyState, Tag, cx, focusRing } from '../component/ui';
import { formatIdr } from '../lib/categories';
import { ACCOUNT_HOME } from '../lib/routes';

interface AlbumEntry {
  orderId: string;
  workId: string;
  title: string;
  category: string | null;
  coverUrl: string | null;
  imageCount: number;
  amountIdr: number;
  purchasedAt: string;
}

const DRIVE_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: 'Karya tersimpan di Google Drive Anda.' },
  cancelled: { ok: false, text: 'Penyimpanan ke Google Drive dibatalkan.' },
  scope_denied: {
    ok: false,
    text: 'Izin Google Drive tidak diberikan. Coba lagi dan centang izin akses Drive.',
  },
  not_owned: { ok: false, text: 'Anda belum memiliki karya tersebut.' },
  not_configured: { ok: false, text: 'Simpan ke Google Drive belum diatur.' },
  state_mismatch: { ok: false, text: 'Sesi Google kedaluwarsa. Silakan coba lagi.' },
  failed: { ok: false, text: 'Gagal menyimpan ke Google Drive. Silakan coba lagi.' },
};

// Drive ids are URL-safe base64-ish; anything else is not a folder we created.
const FOLDER_ID_RE = /^[A-Za-z0-9_-]{10,100}$/;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Result of the Google Drive round-trip, read from the redirect's query string. */
function DriveResultBanner() {
  const params = useSearchParams();
  const router = useRouter();
  const outcome = params.get('drive');
  const message = outcome ? DRIVE_MESSAGES[outcome] : undefined;
  if (!message) return null;

  // Only ever link to a Drive URL we build ourselves from a well-formed id, so a
  // crafted ?folder= can't turn this banner into a link to somewhere else.
  const folderId = params.get('folder');
  const folderUrl =
    message.ok && folderId && FOLDER_ID_RE.test(folderId)
      ? `https://drive.google.com/drive/folders/${folderId}`
      : null;

  return (
    <div
      role="status"
      className={cx('flex items-start gap-3 border px-4 py-3', message.ok ? 'border-ink' : 'border-accent-text')}
    >
      <div className="min-w-0 flex-grow font-sans text-sm">
        <p className={cx('font-semibold', message.ok ? 'text-ink' : 'text-accent-text')}>{message.text}</p>
        {folderUrl && (
          <a
            href={folderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cx('mt-1 inline-flex min-h-11 items-center gap-1.5 text-xs font-bold underline underline-offset-4', focusRing)}
          >
            Buka folder di Google Drive <ExternalLink size={12} aria-hidden />
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={() => router.replace(ACCOUNT_HOME)}
        className={cx('-m-2 flex h-11 w-11 shrink-0 items-center justify-center text-mute hover:text-ink', focusRing)}
        aria-label="Tutup pemberitahuan"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}

function Thumb({ url, title }: { url: string | null; title: string }) {
  return (
    <div className="h-20 w-20 shrink-0 overflow-hidden bg-sheet sm:h-24 sm:w-24">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={title} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-mute">
          <ImageOff size={22} strokeWidth={1.25} aria-hidden />
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mute">{children}</h2>;
}

/** Akun › Koleksi: the works this member bought, ready to download. */
export default function CollectionTab() {
  const [owned, setOwned] = useState<AlbumEntry[]>([]);
  const [pending, setPending] = useState<AlbumEntry[]>([]);
  const [needsRefund, setNeedsRefund] = useState<AlbumEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me/purchases');
        if (!res.ok) throw new Error(await res.text());
        const data: { owned: AlbumEntry[]; pending: AlbumEntry[]; needsRefund?: AlbumEntry[] } = await res.json();
        if (cancelled) return;
        setOwned(data.owned);
        setPending(data.pending);
        setNeedsRefund(data.needsRefund ?? []);
      } catch (err) {
        console.error('Error loading purchases:', err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid gap-10">
      <Suspense fallback={null}>
        <DriveResultBanner />
      </Suspense>

      {needsRefund.length > 0 && (
        <section className="grid gap-3">
          <SectionTitle>Dana akan dikembalikan</SectionTitle>
          <ul className="border-t border-line">
            {needsRefund.map((album) => (
              <li key={album.orderId} className="flex gap-4 border-b border-line py-4">
                <Thumb url={album.coverUrl} title={album.title} />
                <div className="min-w-0 grid content-start gap-1">
                  <p className="font-serif text-lg italic leading-tight">{album.title}</p>
                  <p className="font-sans text-xs text-mute">
                    {formatIdr(album.amountIdr)} · karya ini sudah terjual ke pembeli lain sebelum pembayaran Anda
                    diterima. Admin akan mengembalikan dana Anda.
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending.length > 0 && (
        <section className="grid gap-3">
          <SectionTitle>Menunggu pembayaran</SectionTitle>
          <ul className="border-t border-line">
            {pending.map((album) => (
              <li key={album.orderId} className="flex gap-4 border-b border-line py-4">
                <Thumb url={album.coverUrl} title={album.title} />
                <div className="min-w-0 flex-grow grid content-start gap-1.5">
                  <Tag variant="dashed" className="w-fit">
                    Menunggu pembayaran
                  </Tag>
                  <Link href={`/gallery/${album.workId}`} className={cx('font-serif text-lg italic leading-tight hover:underline', focusRing)}>
                    {album.title}
                  </Link>
                  <p className="font-sans text-xs text-mute">
                    {formatIdr(album.amountIdr)} · dipesan {formatDate(album.purchasedAt)} · terbuka otomatis setelah
                    pembayaran dikonfirmasi
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-3">
        <SectionTitle>
          {loading || loadError ? 'Koleksi' : `Koleksi · ${owned.length} karya`}
        </SectionTitle>

        {loading ? (
          <div className="grid gap-4" aria-busy="true" aria-label="Memuat koleksi">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-24 w-24 animate-pulse bg-sheet" />
                <div className="h-24 flex-grow animate-pulse bg-sheet" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <p role="alert" className="py-10 font-sans text-sm text-accent-text">
            Gagal memuat koleksi. Muat ulang halaman untuk mencoba lagi.
          </p>
        ) : owned.length === 0 ? (
          <EmptyState
            title="Belum ada karya"
            description="Karya yang Anda beli muncul di sini dan bisa diunduh kapan saja. Setiap karya hanya dijual kepada satu pemilik."
            action={<Button href="/gallery">Lihat karya</Button>}
          />
        ) : (
          <ul className="border-t border-line">
            {owned.map((album) => (
              <li key={album.orderId} className="grid gap-4 border-b border-line py-5 sm:grid-cols-[1fr_minmax(0,18rem)] sm:items-center">
                <div className="flex min-w-0 gap-4">
                  <Thumb url={album.coverUrl} title={album.title} />
                  <div className="min-w-0 grid content-start gap-1">
                    <Link
                      href={`/gallery/${album.workId}`}
                      className={cx('font-serif text-xl italic leading-tight hover:underline', focusRing)}
                    >
                      {album.title}
                    </Link>
                    <p className="font-sans text-xs text-mute">
                      {[album.category, `${album.imageCount} file`, `dibeli ${formatDate(album.purchasedAt)}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </div>
                <AlbumDownloads workId={album.workId} imageCount={album.imageCount} compact />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
