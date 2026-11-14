'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Menu, Moon, Sun, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isAdmin } from '../lib/adminUtils';
import { useTheme } from '../context/ThemeContext';
import { WORK_CATEGORIES } from '../lib/categories';
import { ACCOUNT_TABS, MAIN_NAV, isActivePath } from '../lib/routes';
import { cx, focusRing } from './ui';
import type { User } from '../types';

interface NavbarProps {
  onOpenModal: () => void;
  announcementBar?: boolean;
}

const ICON_BUTTON = cx(
  'flex h-11 w-11 items-center justify-center text-ink transition-colors hover:text-mute',
  focusRing
);

function Avatar({ user, size = 'h-7 w-7' }: { user: User; size?: string }) {
  // Avatars are the one round thing on the site (docs/DESIGN.md).
  return user.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatar_url}
      alt=""
      referrerPolicy="no-referrer"
      className={cx(size, 'shrink-0 rounded-full border border-line object-cover')}
    />
  ) : (
    <span
      className={cx(size, 'flex shrink-0 items-center justify-center rounded-full bg-ink font-serif text-xs text-paper')}
      aria-hidden
    >
      {(user.full_name || user.email || 'B').charAt(0).toUpperCase()}
    </span>
  );
}

/** Account pages, plus Admin for admins. */
function accountLinks(user: User) {
  return isAdmin(user) ? [...ACCOUNT_TABS, { href: '/admin', label: 'Admin' }] : ACCOUNT_TABS;
}

export default function Navbar({ onOpenModal, announcementBar = false }: NavbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Transparent over the home page's hero; a solid bar with a rule once the
  // page moves.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
    setAccountOpen(false);
  }

  useEffect(() => {
    if (!accountOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [accountOpen]);

  // The full-screen menu owns the screen while open: no page scroll behind it,
  // Escape closes it.
  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = 'hidden';
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    setAccountOpen(false);
    await logout();
    router.push('/');
  };

  const signIn = () => {
    setMenuOpen(false);
    onOpenModal();
  };

  const themeLabel = isDark ? 'Mode terang' : 'Mode gelap';

  return (
    <>
      <nav
        aria-label="Utama"
        className={cx(
          'fixed z-[100] flex w-full items-center justify-between border-b px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] transition-colors duration-200 [transform:translateZ(0)] sm:px-6 md:px-8',
          announcementBar ? 'top-[calc(2rem+env(safe-area-inset-top))]' : 'top-0',
          scrolled && !menuOpen ? 'border-line bg-paper' : 'border-transparent bg-transparent'
        )}
      >
        {/* Phones: menu button left, logo centred, account right. */}
        <div className="flex w-1/3 items-center md:hidden">
          <button type="button" onClick={() => setMenuOpen(true)} className={cx(ICON_BUTTON, '-ml-3')} aria-label="Buka menu">
            <Menu size={22} strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <div className="flex w-1/3 justify-center md:w-auto md:justify-start">
          <Link href="/" className={cx('font-serif text-3xl font-medium italic tracking-tighter text-ink', focusRing)}>
            Blackhand<span className="text-mute">.</span>
          </Link>
        </div>

        <ul className="hidden items-center gap-10 md:flex lg:gap-12">
          {MAIN_NAV.map((link) => {
            const active = isActivePath(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'relative flex min-h-11 items-center font-sans text-[11px] font-bold uppercase tracking-[0.2em] transition-colors',
                    active ? 'text-accent-text' : 'text-ink hover:text-mute',
                    focusRing
                  )}
                >
                  {link.label}
                  {active && <span className="absolute inset-x-0 bottom-2 h-px bg-current" aria-hidden />}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex w-1/3 items-center justify-end gap-1 md:w-auto md:gap-3">
          <button type="button" onClick={toggleTheme} className={cx(ICON_BUTTON, 'hidden md:flex')} aria-label={themeLabel}>
            {isDark ? <Sun size={18} strokeWidth={1.5} aria-hidden /> : <Moon size={18} strokeWidth={1.5} aria-hidden />}
          </button>

          {user ? (
            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-label="Menu akun"
                className={cx('-mr-2 flex min-h-11 items-center gap-2 px-2 text-ink md:mr-0', focusRing)}
              >
                <Avatar user={user} />
                <span className="hidden max-w-[160px] truncate font-sans text-xs lg:block">
                  {user.full_name || user.email}
                </span>
                <ChevronDown
                  size={14}
                  strokeWidth={2}
                  aria-hidden
                  className={cx('hidden shrink-0 transition-transform md:block', accountOpen && 'rotate-180')}
                />
              </button>

              {accountOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 border border-ink bg-paper">
                  <ul className="py-1">
                    {accountLinks(user).map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setAccountOpen(false)}
                          aria-current={pathname === link.href ? 'page' : undefined}
                          className={cx(
                            'flex min-h-11 items-center px-4 font-sans text-[11px] font-bold uppercase tracking-[0.16em] transition-colors hover:bg-sheet',
                            pathname === link.href ? 'text-accent-text' : 'text-ink',
                            focusRing
                          )}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-line py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={cx(
                        'flex min-h-11 w-full items-center px-4 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-mute transition-colors hover:bg-sheet hover:text-ink',
                        focusRing
                      )}
                    >
                      Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <button type="button" onClick={onOpenModal} className={cx(ICON_BUTTON, '-mr-3 md:hidden')} aria-label="Masuk">
                <UserIcon size={20} strokeWidth={1.5} aria-hidden />
              </button>
              <button
                type="button"
                onClick={onOpenModal}
                className={cx(
                  'hidden min-h-11 items-center border border-ink px-4 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-ink hover:text-paper md:flex',
                  focusRing
                )}
              >
                Masuk
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Phones: a full-screen menu. `inert` while closed — it is only faded
          out, and its links must not take keyboard focus behind the page. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!menuOpen}
        className={cx(
          'fixed inset-0 z-[200] flex flex-col overflow-y-auto bg-paper px-4 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-ink transition-[opacity,transform] duration-300 ease-out md:hidden',
          menuOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        )}
      >
        <div className="flex items-center justify-between border-b border-line py-2">
          <button type="button" onClick={() => setMenuOpen(false)} className={cx(ICON_BUTTON, '-ml-3')} aria-label="Tutup menu">
            <X size={24} strokeWidth={1.5} aria-hidden />
          </button>
          <span className="font-serif text-3xl font-medium italic tracking-tighter">
            Blackhand<span className="text-mute">.</span>
          </span>
          <button type="button" onClick={toggleTheme} className={cx(ICON_BUTTON, '-mr-3')} aria-label={themeLabel}>
            {isDark ? <Sun size={20} strokeWidth={1.5} aria-hidden /> : <Moon size={20} strokeWidth={1.5} aria-hidden />}
          </button>
        </div>

        <ul className="grid gap-1 py-8">
          {MAIN_NAV.map((link) => {
            const active = isActivePath(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'block py-1 font-sans text-5xl font-bold uppercase tracking-[-0.03em]',
                    active ? 'text-accent-text' : 'text-ink',
                    focusRing
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-line py-6">
          <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mute">Kategori karya</p>
          <ul className="flex flex-wrap gap-x-5">
            {WORK_CATEGORIES.map((cat) => (
              <li key={cat}>
                <Link
                  href={`/gallery?category=${encodeURIComponent(cat)}`}
                  onClick={() => setMenuOpen(false)}
                  className={cx('flex min-h-11 items-center font-sans text-sm font-semibold uppercase tracking-[0.08em]', focusRing)}
                >
                  {cat}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto border-t border-line py-6">
          {user ? (
            <>
              <div className="mb-3 flex items-center gap-3">
                <Avatar user={user} size="h-9 w-9" />
                <span className="min-w-0 truncate font-sans text-sm">{user.full_name || user.email}</span>
              </div>
              <ul className="flex flex-wrap gap-x-5">
                {accountLinks(user).map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={cx(
                        'flex min-h-11 items-center font-sans text-[11px] font-bold uppercase tracking-[0.16em]',
                        pathname === link.href ? 'text-accent-text' : 'text-ink',
                        focusRing
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={cx('flex min-h-11 items-center font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-mute', focusRing)}
                  >
                    Keluar
                  </button>
                </li>
              </ul>
            </>
          ) : (
            <button
              type="button"
              onClick={signIn}
              className={cx(
                'flex min-h-12 w-full items-center justify-center border border-ink bg-ink font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-paper',
                focusRing
              )}
            >
              Masuk
            </button>
          )}
        </div>
      </div>
    </>
  );
}
