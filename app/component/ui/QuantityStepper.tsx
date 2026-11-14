'use client';

import { Minus, Plus } from 'lucide-react';
import { cx, focusRing } from './cx';

const STEP = cx(
  'flex h-11 w-11 items-center justify-center border border-ink text-ink transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink',
  focusRing
);

/** − 2 + : how many to buy, kept between `min` and `max`. */
export default function QuantityStepper({
  id,
  label,
  value,
  min = 1,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span id={`${id}-label`} className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink">
        {label}
      </span>
      <div role="group" aria-labelledby={`${id}-label`} className="flex items-center">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label="Kurangi"
          className={STEP}
        >
          <Minus size={14} aria-hidden />
        </button>
        <output
          aria-live="polite"
          className="flex h-11 w-12 items-center justify-center border-y border-ink font-sans text-base font-bold tabular-nums"
        >
          {value}
        </output>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label="Tambah"
          className={STEP}
        >
          <Plus size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
