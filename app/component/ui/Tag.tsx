import type { ReactNode } from 'react';
import { cx } from './cx';

/**
 * Status is told by shape, not by a rainbow of colours:
 *   solid  — can't be bought (Terjual, Stok habis)
 *   outline — information (Milik Anda, Baru, Pilihan)
 *   dashed — temporary (Sedang dibeli)
 *   sale   — a discount, the only red tag (−25%)
 */
export type TagVariant = 'solid' | 'outline' | 'dashed' | 'sale';

const VARIANTS: Record<TagVariant, string> = {
  solid: 'border-ink bg-ink text-paper',
  outline: 'border-ink bg-paper text-ink',
  dashed: 'border-dashed border-ink bg-paper text-ink',
  sale: 'border-accent bg-accent text-on-accent',
};

export default function Tag({
  variant = 'outline',
  icon,
  className,
  children,
}: {
  variant?: TagVariant;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-1 font-sans text-[10px] font-bold uppercase leading-none tracking-[0.16em]',
        VARIANTS[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
