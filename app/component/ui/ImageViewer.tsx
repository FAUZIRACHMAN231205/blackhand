'use client';

import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { cx, focusRing } from './cx';

export interface ViewerImage {
  id: string;
  url: string;
}

const ARROW = cx(
  'absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-ink bg-paper text-ink transition-colors hover:bg-ink hover:text-paper',
  focusRing
);

/**
 * The big picture on a detail page: one image at full width, arrows and a
 * counter when there are more, and a row of thumbnails beneath. The caller
 * owns which image is shown, so other parts of the page can follow it.
 */
export default function ImageViewer({
  images,
  index,
  onIndexChange,
  alt,
  fit = 'contain',
}: {
  images: ViewerImage[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Names the work or product, e.g. "Zidan Anyun". */
  alt: string;
  /** Artworks are shown whole (contain); products fill the square (cover). */
  fit?: 'contain' | 'cover';
}) {
  const count = images.length;
  const current = images[index] ?? images[0];
  const go = (step: number) => onIndexChange((index + step + count) % count);

  return (
    <div className="grid min-w-0 gap-2">
      <div
        className={cx(
          'relative flex w-full items-center justify-center overflow-hidden bg-sheet',
          fit === 'contain' ? 'aspect-[4/5] max-h-[78vh] sm:aspect-[4/3]' : 'aspect-square'
        )}
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={count > 1 ? `${alt} — gambar ${index + 1} dari ${count}` : alt}
            className={cx('h-full w-full', fit === 'contain' ? 'object-contain' : 'object-cover')}
          />
        ) : (
          <ImageOff size={40} strokeWidth={1.25} className="text-mute" aria-hidden />
        )}

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className={cx(ARROW, 'left-3')} aria-label="Gambar sebelumnya">
              <ChevronLeft size={20} strokeWidth={1.5} aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} className={cx(ARROW, 'right-3')} aria-label="Gambar berikutnya">
              <ChevronRight size={20} strokeWidth={1.5} aria-hidden />
            </button>
            <span className="absolute bottom-3 left-3 border border-ink bg-paper px-2 py-1 font-sans text-[10px] font-bold tabular-nums tracking-[0.16em] text-ink">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        // Five across on phones keeps each thumbnail above the 44 px touch size.
        <ul className="grid grid-cols-5 gap-2 sm:grid-cols-6" aria-label="Pilih gambar">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => onIndexChange(i)}
                aria-label={`Gambar ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className={cx(
                  'block aspect-square w-full overflow-hidden border bg-sheet transition-opacity',
                  i === index ? 'border-ink' : 'border-transparent opacity-60 hover:opacity-100',
                  focusRing
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
