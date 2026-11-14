import type { ReactNode } from 'react';
import { cx } from './cx';

/**
 * The top of every page: a small label, one big uppercase title, an optional
 * line of description, and room for actions on the right. Closed by a rule.
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx('grid gap-3 border-b border-ink pb-5 sm:pb-6', className)}>
      {eyebrow && (
        <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mute">{eyebrow}</p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="min-w-0 text-balance break-words font-sans text-4xl font-bold uppercase leading-[0.95] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          {title}
        </h1>
        {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
      </div>
      {description && <p className="max-w-prose font-sans text-sm text-mute sm:text-base">{description}</p>}
    </header>
  );
}
