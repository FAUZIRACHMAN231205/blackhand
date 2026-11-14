import Link from 'next/link';
import { cx, focusRing } from './cx';

export interface TabLink {
  href: string;
  label: string;
}

/**
 * Tabs that are pages: each one has its own address, so a tab can be bookmarked,
 * shared, and opened with the back button. Looks like FilterTabs; the open tab
 * is announced to screen readers with aria-current.
 */
export default function TabLinks({
  label,
  items,
  current,
  className,
}: {
  /** Names the navigation for screen readers, e.g. "Akun". */
  label: string;
  items: TabLink[];
  /** The current pathname; the tab whose href equals it is the open one. */
  current: string | null;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cx('border-b border-line', className)}>
      <ul className="hide-scrollbar flex gap-6 overflow-x-auto overflow-y-hidden">
        {items.map((item) => {
          const active = item.href === current;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'relative flex min-h-11 items-center whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.18em] transition-colors',
                  active ? 'text-ink' : 'text-mute hover:text-ink',
                  focusRing
                )}
              >
                {item.label}
                {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink" aria-hidden />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
