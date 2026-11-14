'use client';

import type { ReactNode } from 'react';
import { ImageOff, ImagePlus, Loader2 } from 'lucide-react';
import { Tag, cx, focusRing } from '../../component/ui';

/** A titled part of an admin form: rule, label, then the fields. */
export function FormSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-ink pt-4 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-10">
      <div className="grid content-start gap-1">
        <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink">{title}</h2>
        {aside && <p className="font-sans text-xs text-mute">{aside}</p>}
      </div>
      <div className="grid min-w-0 gap-5">{children}</div>
    </section>
  );
}

/** One line in an admin list: small picture, name with tags, details, actions. */
export function AdminRow({
  imageUrl,
  title,
  tags,
  meta,
  actions,
}: {
  imageUrl?: string | null;
  title: ReactNode;
  tags?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 border-b border-line py-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-grow gap-3 sm:gap-4">
        {imageUrl !== undefined && (
          <div className="h-16 w-16 shrink-0 overflow-hidden bg-sheet">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-mute">
                <ImageOff size={20} strokeWidth={1.25} aria-hidden />
              </div>
            )}
          </div>
        )}
        <div className="grid min-w-0 content-center gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words font-serif text-lg italic leading-tight text-ink">{title}</h3>
            {tags}
          </div>
          {meta && <div className="font-sans text-xs text-mute">{meta}</div>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </li>
  );
}

export function ListSkeleton({ rows = 4, label }: { rows?: number; label: string }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-16 w-16 animate-pulse bg-sheet" />
          <div className="h-16 flex-grow animate-pulse bg-sheet" />
        </div>
      ))}
    </div>
  );
}

/** A photo in an editable set: the picture, "Sampul" on the cover, actions beneath. */
export function PhotoTile({
  src,
  alt,
  cover = false,
  children,
}: {
  src: string;
  alt: string;
  cover?: boolean;
  /** Buttons for this photo (Jadikan sampul, Hapus). */
  children?: ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <div className="relative aspect-square overflow-hidden bg-sheet">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
        {cover && (
          <span className="absolute left-2 top-2">
            <Tag variant="solid">Sampul</Tag>
          </span>
        )}
      </div>
      {children && <div className="grid gap-1">{children}</div>}
    </div>
  );
}

/** The empty square that opens the file picker. */
export function AddPhotoTile({
  label,
  busy = null,
  multiple = false,
  onFiles,
}: {
  label: string;
  /** While set, shows a spinner with this text and ignores clicks. */
  busy?: string | null;
  multiple?: boolean;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <label
      className={cx(
        'flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-ink px-2 text-center text-ink transition-colors hover:bg-sheet focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-accent-text',
        busy && 'pointer-events-none opacity-60'
      )}
    >
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        disabled={Boolean(busy)}
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {busy ? (
        <Loader2 size={22} className="animate-spin" aria-hidden />
      ) : (
        <ImagePlus size={22} strokeWidth={1.5} aria-hidden />
      )}
      <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em]">{busy ?? label}</span>
    </label>
  );
}

/** A small text button for photo actions, kept at the 44 px touch size. */
export function TileButton({
  children,
  onClick,
  disabled,
  tone = 'default',
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'flex min-h-11 items-center justify-center border px-2 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-40',
        tone === 'danger' ? 'border-dashed border-ink' : 'border-ink',
        focusRing
      )}
    >
      {children}
    </button>
  );
}
