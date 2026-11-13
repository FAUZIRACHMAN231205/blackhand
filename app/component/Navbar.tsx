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
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Solid, blurred navbar background once the page scrolls
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

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
    setAccountMenuOpen(false);
  }

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

  // Lock body scroll
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
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
        className={`fixed w-full z-[100] [transform:translateZ(0)] px-4 sm:px-6 md:px-8 pb-3.5 md:pb-5 pt-[calc(0.875rem+env(safe-area-inset-top))] md:pt-[calc(1.25rem+env(safe-area-inset-top))] flex items-center justify-between transition-[background-color,border-color,box-shadow] duration-300 ease-out ${
          announcementBar ? 'top-[calc(2rem+env(safe-area-inset-top))]' : 'top-0'
        } ${
          scrolled && !menuOpen
            ? 'bg-white dark:bg-slate-950 border-b border-black/5 dark:border-white/10 shadow-[0_2px_10px_0_rgba(0,0,0,0.05)]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        {/* Mobile Hamburger (Left on mobile, hidden on desktop) */}
        <div className="flex items-center md:hidden w-1/3">
          <button
            onClick={() => setMenuOpen(true)}
            className="-ml-2 flex h-11 w-11 items-center justify-start text-black dark:text-white hover:opacity-60 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} strokeWidth={1.5} />
          </button>
        </div>

        {/* Logo (Center on mobile, Left on desktop) */}
        <div className="flex justify-center md:justify-start w-1/3 md:w-auto z-[202]">
          <Link href="/" className="font-serif text-3xl font-medium tracking-tighter italic text-black dark:text-white">
            Blackhand<span className="text-zinc-500 dark:text-zinc-600 italic">.</span>
          </Link>
        </div>

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
            <div className="absolute left-0 top-full grid grid-rows-[0fr] overflow-hidden opacity-0 transition-all duration-300 ease-out group-hover/collection:grid-rows-[1fr] group-hover/collection:opacity-100 group-focus-within/collection:grid-rows-[1fr] group-focus-within/collection:opacity-100">
              <div className="min-h-0">
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

        {/* Ikon Desktop & Kanan Mobile */}
        <div className="flex items-center justify-end w-1/3 md:w-auto space-x-4 md:space-x-6 z-[202]">
          {/* Dark Mode Toggle (desktop) */}
          <button
            onClick={toggleTheme}
            className="hidden md:flex h-10 w-10 -m-2 items-center justify-center text-black dark:text-white hover:text-black/60 dark:hover:text-white/60 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
          </button>
          
          {/* Desktop user controls */}
          {user ? (
            <div ref={accountMenuRef} className="relative">
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
                  className={`hidden md:block shrink-0 transition-transform duration-300 ${accountMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <div
                className={`absolute right-0 top-full grid overflow-hidden transition-all duration-300 ease-out ${
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
              className="flex h-10 w-10 -m-2 items-center justify-center text-black dark:text-white hover:text-black/60 dark:hover:text-white/60 transition-colors"
              aria-label="Login"
            >
              <User size={18} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </nav>

      {/* ─── Mobile Slide-Over Menu (Dropdead Style) ─────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-[200] bg-white dark:bg-slate-950 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] md:hidden flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] px-6 ${
          menuOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-12 opacity-0 pointer-events-none'
        }`}
        // `inert` while closed: the panel is only faded out, so without it its
        // links would still take keyboard focus behind the page.
        inert={!menuOpen}
      >
        <div className="flex items-center justify-between py-4">
          <button
            onClick={() => setMenuOpen(false)}
            className="-ml-2 w-11 h-11 flex items-center justify-start text-black dark:text-white hover:opacity-60 transition-colors"
            aria-label="Close menu"
          >
            <X size={28} strokeWidth={1.5} />
          </button>
          <div className="flex space-x-4">
             <button
                onClick={toggleTheme}
                className="flex h-11 w-11 items-center justify-end text-black dark:text-white hover:opacity-60 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
             </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-4 py-8">
          {navLinks.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="group w-fit overflow-hidden"
            >
              <span 
                className={`block font-sans text-5xl sm:text-6xl font-black uppercase tracking-tighter text-black dark:text-white transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] hover:italic hover:text-transparent hover:[-webkit-text-stroke:2px_black] dark:hover:[-webkit-text-stroke:2px_white] ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: `${menuOpen ? i * 50 : 0}ms` }}
              >
                {link.label}
              </span>
            </Link>
          ))}
        </div>

        <div className={`mt-auto flex flex-col space-y-6 pt-6 border-t border-black/10 dark:border-white/10 pb-6 transition-all duration-700 delay-300 ${
          menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <div>
            <p className="font-sans text-[10px] font-black tracking-[0.2em] uppercase text-black/50 dark:text-white/50 mb-3">
              Categories
            </p>
            <div className="flex flex-wrap gap-3">
              {WORK_CATEGORIES.map((cat) => (
                <Link
                  key={cat}
                  href={`/gallery?category=${encodeURIComponent(cat)}`}
                  onClick={() => setMenuOpen(false)}
                  className="font-sans text-sm font-bold uppercase tracking-wider text-black dark:text-white hover:italic transition-all"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}