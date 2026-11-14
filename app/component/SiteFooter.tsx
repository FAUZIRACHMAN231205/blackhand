import Link from 'next/link';
import { ACCOUNT_HOME, MAIN_NAV } from '../lib/routes';
import { cx, focusRing } from './ui';

const LINK = cx(
  'flex min-h-11 items-center font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-ink transition-colors hover:text-mute',
  focusRing
);

/** The bottom of every public and account page. */
export default function SiteFooter() {
  return (
    <footer className="border-t border-ink bg-paper px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-10 text-ink sm:px-6 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-2">
          <Link href="/" className={cx('flex min-h-11 w-fit items-center font-serif text-4xl font-medium italic tracking-tighter', focusRing)}>
            Blackhand<span className="text-mute">.</span>
          </Link>
          <p className="max-w-sm font-sans text-sm text-mute">
            Karya seni eksklusif — setiap karya hanya untuk satu pemilik — dan merchandise resmi.
          </p>
        </div>

        <nav aria-label="Kaki halaman">
          <ul className="flex flex-wrap gap-x-8">
            {MAIN_NAV.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={ACCOUNT_HOME} className={LINK}>
                Akun
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <p className="mx-auto mt-8 max-w-7xl border-t border-line pt-4 font-sans text-[11px] uppercase tracking-[0.16em] text-mute">
        © {new Date().getFullYear()} Blackhand
      </p>
    </footer>
  );
}
