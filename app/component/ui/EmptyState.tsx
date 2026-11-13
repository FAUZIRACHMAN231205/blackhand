import type { ReactNode } from 'react';
import { cx } from './cx';

/** What a list shows when it has nothing yet: what will appear, and the way forward. */
export default function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('grid justify-items-start gap-3 border border-dashed border-mute p-6 sm:p-8', className)}>
      <h2 className="font-sans text-lg font-bold uppercase tracking-tight text-ink">{title}</h2>
      {description && <p className="max-w-prose font-sans text-sm text-mute">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
