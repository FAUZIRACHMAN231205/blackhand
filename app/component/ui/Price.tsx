import { formatIdr } from '../../lib/categories';
import { cx } from './cx';

const SIZES = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl sm:text-3xl',
} as const;

/**
 * A rupiah amount, with the original struck through when `compareAt` is a
 * real discount (higher than `amount`). Anything else shows the price alone.
 */
export default function Price({
  amount,
  compareAt,
  size = 'md',
  className,
}: {
  amount: number;
  compareAt?: number | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const onSale = compareAt != null && compareAt > amount;

  return (
    <span className={cx('inline-flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cx('font-sans font-bold tabular-nums text-ink', SIZES[size])}>{formatIdr(amount)}</span>
      {onSale && (
        <s className="font-sans text-xs font-normal tabular-nums text-mute">
          <span className="sr-only">Harga awal </span>
          {formatIdr(compareAt)}
        </s>
      )}
    </span>
  );
}
