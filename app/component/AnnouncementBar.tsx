'use client';

// Landing-page-only for now — a global version would need every page's
// pt-* (sized for the navbar alone) re-audited. See Navbar's `announcementBar`
// prop, which is what actually makes room for this above the nav.
const MESSAGES = [
  'KOLEKSI BARU // KARYA EDISI TERBATAS',
  'MERCHANDISE RESMI BLACKHAND SUDAH TERSEDIA',
  'SETIAP KARYA, SATU JIWA YANG SAMA',
];

export default function AnnouncementBar() {
  // The messages render twice so a -50% translate loops with no visible seam.
  // Only the second copy is hidden from screen readers, so the announcements
  // are still read once instead of not at all.
  return (
    <div
      role="region"
      aria-label="Pengumuman"
      className="fixed inset-x-0 top-0 z-[110] overflow-hidden bg-black pt-[env(safe-area-inset-top)] text-white [transform:translateZ(0)]"
    >
      <div className="animate-marquee flex h-8 items-center whitespace-nowrap">
        {[false, true].map((duplicate) =>
          MESSAGES.map((msg) => (
            <span
              key={`${duplicate}-${msg}`}
              aria-hidden={duplicate || undefined}
              className="mx-6 shrink-0 font-sans text-[10px] font-bold uppercase tracking-[0.25em]"
            >
              {msg}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
