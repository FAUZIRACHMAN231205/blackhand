'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { User, LogOut, Settings, Moon, Sun, Menu, X, Library, Package, ChevronDown, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isAdmin } from '../lib/adminUtils';
import { useTheme } from '../context/ThemeContext';
import { WORK_CATEGORIES } from '../lib/categories';

interface NavbarProps {
  onOpenModal: () => void;
  /** True when an AnnouncementBar sits above the nav, so it starts lower instead of at top:0. */
  announcementBar?: boolean;
}

export default function Navbar({ onOpenModal, announcementBar = false }: NavbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Solid, blurred navbar background once the page scrolls, so the black logo
  // and links stay legible over light content sliding underneath. It stays
  // put — no hide-on-scroll — just transparent-to-solid.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push('/');
  };

  // Close the menu on route change. Adjusted during render rather than in an
  // effect, so the drawer never paints one frame open on the new page.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
    setAccountMenuOpen(false);
  }

  // Close the account dropdown on an outside click or Escape — same idea as
  // the mobile drawer, minus the body-scroll lock (this one's too small to need it).
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [accountMenuOpen]);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    // Lock body scroll
    document.body.style.overflow = 'hidden';
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [menuOpen]);

  const navLinks = [
    { href: '/works', label: 'Feed' },
    { href: '/gallery', label: 'Collection' },
    { href: '/shop', label: 'Shop' },
    { href: '/manifesto', label: 'Manifesto' },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <>
      <nav
        // Transparent over whatever's underneath (e.g. the homepage hero image)
        // until the page scrolls, then a solid bar — same as dropdead.world's
        // header, which overlays its hero banner the same way. Stays fixed in
        // place the whole time; [transform:translateZ(0)] forces its own
        // compositor layer. No backdrop-blur here on purpose: a blur filter on
        // a fixed element knocks Chrome off the compositor-only fast scroll
        // path, which reads as the bar lagging a frame behind during a fast
        // scroll — i.e. looking like it "follows" the page.
        className={`fixed w-full z-[100] [transform:translateZ(0)] px-4 sm:px-6 md:px-8 pb-3.5 md:pb-5 pt-[calc(0.875rem+env(safe-area-inset-top))] md:pt-[calc(1.25rem+env(safe-area-inset-top))] flex justify-between items-center transition-[background-color,border-color,box-shadow] duration-300 ease-out ${
          announcementBar ? 'top-[calc(2rem+env(safe-area-inset-top))]' : 'top-0'
        } ${
          scrolled
            ? 'bg-white dark:bg-slate-950 border-b border-black/5 dark:border-white/10 shadow-[0_2px_10px_0_rgba(0,0,0,0.05)]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        {/* Logo dengan Cormorant Garamond */}
        <Link href="/" className="font-serif text-3xl font-medium tracking-tighter italic text-black dark:text-white">
          Blackhand<span className="text-zinc-500 dark:text-zinc-600 italic">.</span>
        </Link>

        {/* Menu Navigasi Desktop dengan Poppins */}
        <div className="hidden md:flex items-center space-x-8 lg:space-x-12 font-sans text-xs font-black tracking-[0.2em] uppercase text-black dark:text-white">
          <Link
            href="/works"
            className={`group relative py-2 transition-colors ${
              isActive('/works') ? 'text-violet-600 dark:text-violet-400' : 'hover:text-black/60 dark:hover:text-white/60'
            }`}
          >
            Feed
            <span
              className={`absolute -bottom-0.5 left-0 h-[1.5px] bg-current transition-all duration-300 ${
                isActive('/works') ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            />
          </Link>

          {/* Collection & Shop reveal a quick-filter dropdown on hover — the
              same 0fr→1fr grid-rows slide dropdead uses for CATEGORIES/EXPLORE
              — while the label itself still navigates straight to the page. */}
          <div className="group/collection relative">
            <Link
              href="/gallery"
              className={`group relative flex items-center gap-1 py-2 transition-colors ${
                isActive('/gallery') ? 'text-violet-600 dark:text-violet-400' : 'hover:text-black/60 dark:hover:text-white/60'
              }`}
            >
              Collection
              <ChevronDown size={12} strokeWidth={2.5} className="transition-transform duration-300 group-hover/collection:rotate-180 group-focus-within/collection:rotate-180" />
              <span
                className={`absolute -bottom-0.5 left-0 h-[1.5px] bg-current transition-all duration-300 ${
                  isActive('/gallery') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </Link>
            {/* focus-within as well as hover, so keyboard users can open it too. */}
            <div className="absolute left-0 top-full grid grid-rows-[0fr] overflow-hidden opacity-0 transition-all duration-300 ease-out group-hover/collection:grid-rows-[1fr] group-hover/collection:opacity-100 group-focus-within/collection:grid-rows-[1fr] group-focus-within/collection:opacity-100">
              <div className="min-h-0">
                {/* No card/background here on purpose — dropdead's own dropdowns are just
                    text floating over the page, no panel behind them. */}
                <div className="mt-2 w-48 space-y-1 p-2 normal-case tracking-normal">
                  <Link href="/gallery" className="block px-1 py-1.5 text-xs font-bold text-black/70 transition-colors hover:text-black dark:text-white/70 dark:hover:text-white">
                    Semua Karya
                  </Link>
                  {WORK_CATEGORIES.map((cat) => (
                    <Link
                      key={cat}
                      href={`/gallery?category=${encodeURIComponent(cat)}`}
                      className="block px-1 py-1.5 text-xs font-bold text-black/70 transition-colors hover:text-black dark:text-white/70 dark:hover:text-white"
                    >
                      {cat}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="group/shop relative">
            <Link
              href="/shop"
              className={`group relative flex items-center gap-1 py-2 transition-colors ${
                isActive('/shop') ? 'text-violet-600 dark:text-violet-400' : 'hover:text-black/60 dark:hover:text-white/60'
              }`}
            >
              Shop
              <ChevronDown size={12} strokeWidth={2.5} className="transition-transform duration-300 group-hover/shop:rotate-180 group-focus-within/shop:rotate-180" />
              <span
                className={`absolute -bottom-0.5 left-0 h-[1.5px] bg-current transition-all duration-300 ${
                  isActive('/shop') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </Link>
            <div className="absolute left-0 top-full grid grid-rows-[0fr] overflow-hidden opacity-0 transition-all duration-300 ease-out group-hover/shop:grid-rows-[1fr] group-hover/shop:opacity-100 group-focus-within/shop:grid-rows-[1fr] group-focus-within/shop:opacity-100">
              <div className="min-h-0">
                <div className="mt-2 w-44 space-y-1 p-2 normal-case tracking-normal">
                  <Link href="/shop" className="block px-1 py-1.5 text-xs font-bold text-black/70 transition-colors hover:text-black dark:text-white/70 dark:hover:text-white">
                    Semua
                  </Link>
                  <Link href="/shop?filter=new" className="block px-1 py-1.5 text-xs font-bold text-black/70 transition-colors hover:text-black dark:text-white/70 dark:hover:text-white">
                    Baru
                  </Link>
                  <Link href="/shop?filter=sale" className="block px-1 py-1.5 text-xs font-bold text-black/70 transition-colors hover:text-black dark:text-white/70 dark:hover:text-white">
                    Diskon
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/manifesto"
            className={`group relative py-2 transition-colors ${
              isActive('/manifesto') ? 'text-violet-600 dark:text-violet-400' : 'hover:text-black/60 dark:hover:text-white/60'
            }`}
          >
            Manifesto
            <span
              className={`absolute -bottom-0.5 left-0 h-[1.5px] bg-current transition-all duration-300 ${
                isActive('/manifesto') ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            />
          </Link>
        </div>

        {/* Ikon Desktop & Hamburger */}
        <div className="flex items-center space-x-6">
          {/* Dark Mode Toggle (desktop) */}
          <button
            onClick={toggleTheme}
            className="hidden md:flex h-10 w-10 -m-2 items-center justify-center text-black dark:text-white hover:text-black/60 dark:hover:text-white/60 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
          </button>
          
          {/* Desktop user controls — one avatar trigger, dropdead-style hover/click
              dropdown underneath, instead of four links fighting for room. */}
          {user ? (
            <div ref={accountMenuRef} className="relative hidden md:block">
              <button
                onClick={() => setAccountMenuOpen((v) => !v)}
                aria-expanded={accountMenuOpen}
                className="flex items-center gap-2 py-2 max-w-[190px] text-black dark:text-white"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 shrink-0 rounded-full border border-black/10 object-cover dark:border-white/15"
                  />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 font-serif text-xs text-white dark:bg-zinc-100 dark:text-black">
                    {(user.full_name || user.email || 'B').charAt(0).toUpperCase()}
                  </span>
                )}
                {/* On tablets the row is tight: avatar only, name from lg up. */}
                <span className="hidden truncate font-sans text-xs lg:block">
                  {user.full_name || user.email}
                </span>
                <ChevronDown
                  size={14}
                  strokeWidth={2}
                  className={`shrink-0 transition-transform duration-300 ${accountMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Same 0fr→1fr grid-rows trick dropdead uses for its CATEGORIES/
                  EXPLORE dropdowns: a clipped height animates open instead of
                  the menu just popping in. */}
              <div
                className={`absolute right-0 top-full grid overflow-hidden transition-all duration-300 ease-out ${
                  // `invisible` when closed keeps the hidden links out of the Tab order.
                  accountMenuOpen ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="min-h-0">
                  <div className="mt-2 w-56 space-y-0.5 rounded-2xl border border-black/5 bg-white/95 p-2 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-950/95">
                    <Link
                      href="/dashboard"
                      onClick={() => setAccountMenuOpen(false)}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-sans text-xs font-bold transition-colors ${
                        pathname === '/dashboard'
                          ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                          : 'text-black/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/5'
                      }`}
                    >
                      <LayoutDashboard size={14} strokeWidth={2} />
                      Dashboard
                    </Link>
                    <Link
                      href="/albums"
                      onClick={() => setAccountMenuOpen(false)}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-sans text-xs font-bold transition-colors ${
                        pathname === '/albums'
                          ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                          : 'text-black/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/5'
                      }`}
                    >
                      <Library size={14} strokeWidth={2} />
                      Album Saya
                    </Link>
                    <Link
                      href="/orders"
                      onClick={() => setAccountMenuOpen(false)}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-sans text-xs font-bold transition-colors ${
                        pathname === '/orders'
                          ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                          : 'text-black/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/5'
                      }`}
                    >
                      <Package size={14} strokeWidth={2} />
                      Pesanan Saya
                    </Link>
                    {isAdmin(user) && (
                      <Link
                        href="/admin"
                        onClick={() => setAccountMenuOpen(false)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-sans text-xs font-bold transition-colors ${
                          pathname?.startsWith('/admin')
                            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                            : 'text-black/80 hover:bg-black/5 dark:text-white/80 dark:hover:bg-white/5'
                        }`}
                      >
                        <Settings size={14} strokeWidth={2} />
                        Admin
                      </Link>
                    )}
                    <div className="my-1 border-t border-black/5 dark:border-white/10" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 font-sans text-xs font-bold text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                    >
                      <LogOut size={14} strokeWidth={2} />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={onOpenModal}
              className="hidden md:flex py-2 items-center space-x-2 font-sans text-xs font-bold tracking-[0.15em] uppercase text-black dark:text-white hover:text-black/60 dark:hover:text-white/60 transition-colors"
            >
              <User size={16} strokeWidth={2} />
              <span className="hidden sm:block">
                My Account
              </span>
            </button>
          )}

          {/* Hamburger Button (mobile only) */}
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden -mr-2 flex h-11 w-11 items-center justify-center text-black dark:text-white hover:text-black/60 dark:hover:text-white/60 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={1.5} />
          </button>
        </div>
      </nav>

      {/* ─── Mobile Slide-Over Drawer ─────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!menuOpen}
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 z-[201] h-full w-[min(320px,85vw)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-l border-black/5 dark:border-white/10 shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex flex-col h-full">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 dark:border-white/10">
            <span className="font-serif text-xl font-medium tracking-tighter italic text-black dark:text-white">
              Menu
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>

          {/* User Info (if logged in) */}
          {user && (
            <div className="px-6 py-5 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Avatar"
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full border-2 border-violet-500/30 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold font-sans">
                    {(user.full_name || user.email || 'B').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-sans text-sm font-bold text-black dark:text-white truncate">
                    {user.full_name || 'Blackhand User'}
                  </p>
                  <p className="font-sans text-[11px] text-black/50 dark:text-white/50 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-sans text-sm font-bold transition-colors ${
                  isActive(link.href)
                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                    : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {user && (
              <Link
                href="/albums"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-sans text-sm font-bold transition-colors ${
                  pathname === '/albums'
                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                    : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Library size={16} strokeWidth={1.5} />
                Album Saya
              </Link>
            )}

            {user && (
              <Link
                href="/orders"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-sans text-sm font-bold transition-colors ${
                  pathname === '/orders'
                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                    : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Package size={16} strokeWidth={1.5} />
                Pesanan Saya
              </Link>
            )}

            {user && isAdmin(user) && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-sans text-sm font-bold transition-colors ${
                  pathname?.startsWith('/admin')
                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                    : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Settings size={16} strokeWidth={1.5} />
                Admin Panel
              </Link>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="px-4 py-4 border-t border-black/5 dark:border-white/10 space-y-2">
            {/* Theme Toggle */}
            <button
              onClick={() => { toggleTheme(); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-sans text-sm font-bold text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {isDark ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>

            {user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-sans text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut size={16} strokeWidth={1.5} />
                Logout
              </button>
            ) : (
              <button
                onClick={() => { setMenuOpen(false); onOpenModal(); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-sans text-sm font-bold transition-colors hover:opacity-90"
              >
                <User size={16} strokeWidth={2} />
                My Account
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}