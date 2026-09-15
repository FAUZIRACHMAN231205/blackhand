'use client';

import { Lock } from 'lucide-react';

/**
 * Sits on top of a blurred preview so a locked image reads as *withheld*
 * rather than broken. Purely presentational — the real protection is that the
 * full-resolution file never leaves the private bucket.
 */
export default function LockedOverlay({
  label = 'Terkunci',
  hint,
  compact = false,
}: {
  label?: string;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35 text-center backdrop-blur-[1px]">
      <div
        className={`flex items-center justify-center rounded-full border border-white/25 bg-black/55 text-white ${
          compact ? 'h-7 w-7' : 'h-11 w-11'
        }`}
      >
        <Lock size={compact ? 13 : 18} strokeWidth={1.75} />
      </div>
      <p
        className={`font-sans font-bold uppercase tracking-[0.18em] text-white ${
          compact ? 'text-[9px]' : 'text-[10px]'
        }`}
      >
        {label}
      </p>
      {hint && !compact && (
        <p className="max-w-[85%] font-sans text-[10px] leading-snug text-white/70">{hint}</p>
      )}
    </div>
  );
}
