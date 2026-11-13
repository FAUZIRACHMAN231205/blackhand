import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx, focusRing } from './cx';

/**
 * One card for both artworks and products, so every grid on the site reads
 * the same: square image, tags top-left, the name in italic serif beneath,
 * then a label row — category left, price or status right.
 */
export default function CatalogCard({
  href,
  imageUrl,
  title,
  meta,
  aside,
  tags,
  dimmed = false,
}: {
  href: string;
  imageUrl: string | null | undefined;
  title: string;
  /** Left of the label row, e.g. the category. */
  meta?: ReactNode;
  /** Right of the label row, e.g. a <Price> or "Terjual". */
  aside?: ReactNode;
  /** <Tag>s laid over the image's top-left corner. */
  tags?: ReactNode;
  /** Sold out: fade the image so the grid shows what's still available. */
  dimmed?: boolean;
}) {
  return (
    // grid-cols-1 (minmax(0, 1fr)) keeps every row inside the card's column;
    // a bare `grid` sizes its track to the widest content and spills over.
    <Link href={href} className={cx('group grid min-w-0 grid-cols-1 content-start gap-2.5', focusRing)}>
      <div className="relative aspect-square w-full overflow-hidden bg-sheet">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className={cx(
              'h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]',
              dimmed && 'opacity-50 grayscale'
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-mute">
            <ImageOff size={32} strokeWidth={1.25} aria-hidden />
          </div>
        )}
        {tags && <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">{tags}</div>}
      </div>

      <h3 className="line-clamp-2 font-serif text-lg font-medium italic leading-tight text-ink sm:text-xl">
        {title}
      </h3>

      {(meta || aside) && (
        // Wraps on narrow phones: the price drops below the category instead of
        // either one being cut off.
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-mute">
          <span className="min-w-0 max-w-full truncate">{meta}</span>
          {aside && <span className="max-w-full normal-case tracking-normal">{aside}</span>}
        </div>
      )}
    </Link>
  );
}
