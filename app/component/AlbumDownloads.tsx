'use client';

import { useState } from 'react';
import { FileImage, FileArchive, FileText, HardDriveUpload, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

type Format = 'jpg' | 'zip' | 'pdf';

function filenameFrom(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

interface AlbumDownloadsProps {
  workId: string;
  imageCount: number;
  /** When set, offers a JPG of just this image (the one on screen). */
  currentImageId?: string;
  currentPosition?: number;
  compact?: boolean;
}

/**
 * Download actions for an album the visitor owns. The server re-checks
 * ownership on every request; these buttons are only shown as a convenience.
 */
export default function AlbumDownloads({
  workId,
  imageCount,
  currentImageId,
  currentPosition,
  compact = false,
}: AlbumDownloadsProps) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<Format | null>(null);

  // Fetched rather than linked so the button can show progress while the
  // server packs the ZIP/PDF, and a failure becomes a toast, not a JSON page.
  const download = async (format: Format) => {
    if (busy) return;
    setBusy(format);
    try {
      const query = new URLSearchParams({ format });
      if (format === 'jpg' && currentImageId) query.set('image', currentImageId);

      const res = await fetch(`/api/works/${workId}/download?${query}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast({ type: 'error', message: data.error || 'Gagal mengunduh.' });
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filenameFrom(res.headers.get('Content-Disposition'), `album.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Give the browser a moment to start the save before releasing the blob.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      console.error('Download error:', err);
      showToast({ type: 'error', message: 'Gagal mengunduh. Periksa koneksi Anda.' });
    } finally {
      setBusy(null);
    }
  };

  const buttonClass = `flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 font-sans font-bold text-black dark:text-white transition-colors hover:border-violet-500/40 hover:bg-violet-500/5 disabled:cursor-wait disabled:opacity-60 ${
    compact ? 'text-[11px]' : 'text-xs'
  }`;

  const icon = (format: Format, Idle: typeof FileImage) =>
    busy === format ? <Loader2 size={15} className="animate-spin" /> : <Idle size={15} strokeWidth={1.75} />;

  return (
    <div className="space-y-2">
      <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {currentImageId && !compact && (
          <button type="button" onClick={() => download('jpg')} disabled={busy !== null} className={buttonClass}>
            {icon('jpg', FileImage)}
            JPG{currentPosition ? ` #${currentPosition}` : ''}
          </button>
        )}
        <button type="button" onClick={() => download('zip')} disabled={busy !== null} className={buttonClass}>
          {icon('zip', FileArchive)}
          {compact ? 'ZIP' : `ZIP · ${imageCount} JPG`}
        </button>
        <button type="button" onClick={() => download('pdf')} disabled={busy !== null} className={buttonClass}>
          {icon('pdf', FileText)}
          PDF
        </button>
        {/* A navigation, not a fetch: Google's consent screen needs the full page. */}
        <a href={`/api/works/${workId}/drive`} className={buttonClass}>
          <HardDriveUpload size={15} strokeWidth={1.75} />
          {compact ? 'Drive' : 'Google Drive'}
        </a>
      </div>
      {!compact && (
        <p className="font-sans text-[11px] leading-snug text-black/50 dark:text-white/50">
          Google Drive menyalin {imageCount} gambar asli ke folder baru di Drive Anda.
        </p>
      )}
    </div>
  );
}
