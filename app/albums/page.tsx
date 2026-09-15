'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Library,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  X,
  ImageOff,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../component/Navbar';
import AlbumDownloads from '../component/AlbumDownloads';
import { LoadingSpinner, SkeletonGrid } from '../component/LoadingStates';
import { formatIdr } from '../lib/categories';

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
  ok: { ok: true, text: 'Album tersimpan di Google Drive Anda.' },
  cancelled: { ok: false, text: 'Penyimpanan ke Google Drive dibatalkan.' },
  scope_denied: {
    ok: false,
    text: 'Izin Google Drive tidak diberikan. Coba lagi dan centang izin akses Drive.',
  },
  not_owned: { ok: false, text: 'Anda belum memiliki album tersebut.' },
  not_configured: { ok: false, text: 'Simpan ke Google Drive belum dikonfigurasi.' },
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
      className={`mb-8 flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${
        message.ok
          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300'
          : 'border-rose-500/30 bg-rose-500/5 text-rose-800 dark:text-rose-300'
      }`}
    >
      {message.ok ? (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      ) : (
        <XCircle size={18} className="mt-0.5 shrink-0" />
      )}
      <div className="min-w-0 flex-grow font-sans text-sm">
        <p className="font-semibold">{message.text}</p>
        {folderUrl && (
          <a
            href={folderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold underline underline-offset-2"
          >
            Buka folder di Google Drive <ExternalLink size={12} />
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={() => router.replace('/albums')}
        className="-m-1.5 shrink-0 p-2.5 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Tutup pemberitahuan"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function MyAlbums() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [owned, setOwned] = useState<AlbumEntry[]>([]);
  const [pending, setPending] = useState<AlbumEntry[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me/purchases');
        if (!res.ok) throw new Error(await res.text());
        const data: { owned: AlbumEntry[]; pending: AlbumEntry[] } = await res.json();
        if (cancelled) return;
        setOwned(data.owned);
        setPending(data.pending);
      } catch (err) {
        console.error('Error loading albums:', err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoadingAlbums(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) return <LoadingSpinner />;
  if (!user) return null;

  return (
    <>
      <Navbar onOpenModal={() => {}} />

      <main className="min-h-[100dvh] bg-white px-4 pb-16 pt-24 text-black transition-colors duration-300 dark:bg-slate-950 dark:text-white md:px-6">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => router.push('/gallery')}
            className="group mb-6 flex items-center gap-2 py-2 text-black/60 transition-colors hover:text-black dark:text-white/60 dark:hover:text-white"
          >
            <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1" />
            <span className="font-sans text-sm font-medium">Kembali ke Galeri</span>
          </button>

          <header className="mb-10">
            <h1 className="mb-2 font-serif text-4xl font-medium italic sm:text-5xl">Album Saya</h1>
            <p className="font-sans text-sm text-black/60 dark:text-white/60">
              {loadingAlbums
                ? 'Memuat koleksi Anda...'
                : `${owned.length} album dimiliki · unduh kapan saja dalam JPG, ZIP, PDF, atau simpan ke Google Drive.`}
            </p>
          </header>

          <Suspense fallback={null}>
            <DriveResultBanner />
          </Suspense>

          {pending.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
                Menunggu Pembayaran
              </h2>
              <ul className="space-y-2">
                {pending.map((album) => (
                  <li
                    key={album.orderId}
                    className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3"
                  >
                    <Clock size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="min-w-0 flex-grow">
                      <p className="truncate font-serif text-base italic">{album.title}</p>
                      <p className="font-sans text-[11px] text-black/55 dark:text-white/55">
                        {formatIdr(album.amountIdr)} · dipesan {formatDate(album.purchasedAt)} · terbuka
                        otomatis setelah pembayaran dikonfirmasi
                      </p>
                    </div>
                    <Link
                      href={`/gallery/${album.workId}`}
                      className="shrink-0 rounded-lg px-3 py-2 font-sans text-[11px] font-bold text-violet-600 transition-colors hover:bg-violet-500/10 dark:text-violet-400"
                    >
                      Lihat
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {loadingAlbums ? (
            <SkeletonGrid count={3} />
          ) : loadError ? (
            <p className="py-16 text-center font-sans text-sm text-rose-600 dark:text-rose-400">
              Gagal memuat album. Muat ulang halaman untuk mencoba lagi.
            </p>
          ) : owned.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 p-12 text-center dark:border-white/15">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/10">
                <Library size={28} strokeWidth={1.25} className="opacity-50" />
              </div>
              <h2 className="mb-2 font-serif text-2xl italic">Belum ada album</h2>
              <p className="mb-6 font-sans text-sm text-black/60 dark:text-white/60">
                Album yang Anda beli akan muncul di sini, siap diunduh kapan saja.
              </p>
              <Link
                href="/gallery"
                className="inline-flex items-center gap-2 rounded-xl bg-black px-6 py-3 font-sans text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:opacity-90 dark:bg-white dark:text-black"
              >
                Jelajahi Galeri
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {owned.map((album) => (
                <article
                  key={album.orderId}
                  className="overflow-hidden rounded-2xl border border-black/5 bg-white/80 shadow-sm transition-colors dark:border-white/10 dark:bg-zinc-950/60"
                >
                  <Link href={`/gallery/${album.workId}`} className="group block">
                    <div className="relative aspect-[4/3] overflow-hidden bg-black/5 dark:bg-white/5">
                      {album.coverUrl ? (
                        <img
                          src={album.coverUrl}
                          alt={album.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageOff size={32} strokeWidth={1.25} className="opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="px-4 pt-4">
                      <h3 className="line-clamp-2 font-serif text-lg italic transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400">
                        {album.title}
                      </h3>
                      <p className="mt-1 font-sans text-[11px] text-black/55 dark:text-white/55">
                        {[album.category, `${album.imageCount} gambar`, `dibeli ${formatDate(album.purchasedAt)}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </Link>
                  <div className="p-4">
                    <AlbumDownloads workId={album.workId} imageCount={album.imageCount} compact />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
