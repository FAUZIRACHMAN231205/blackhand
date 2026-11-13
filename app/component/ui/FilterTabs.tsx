import { cx, focusRing } from './cx';

export interface FilterTab<T> {
  value: T;
  label: string;
}

/**
 * A row of filters (Semua / Paintings / …). Swipes sideways on phones. The
 * active one is ink with an underline; the rest are muted. The caller decides
 * what a change does — usually updating the URL, so a filtered view can be
 * refreshed and shared.
 */
export default function FilterTabs<T extends string | null>({
  label,
  items,
  value,
  onChange,
  className,
}: {
  /** Names the group for screen readers, e.g. "Kategori". */
  label: string;
  items: FilterTab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx(
        'hide-scrollbar flex gap-6 overflow-x-auto overflow-y-hidden border-b border-line',
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.label}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (!active) onChange(item.value);
            }}
            className={cx(
              'relative min-h-11 shrink-0 whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.18em] transition-colors',
              active ? 'text-ink' : 'text-mute hover:text-ink',
              focusRing
            )}
          >
            {item.label}
            {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
