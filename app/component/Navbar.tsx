'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { User, LogOut, Settings, Moon, Sun, Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isAdmin } from '../lib/adminUtils';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  onOpenModal: () => void;
}

export default function Navbar({ onOpenModal }: NavbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Solid, blurred navbar background once the page scrolls, so the black logo
  // and links stay legible over light content sliding underneath.
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

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
  ];

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-[100] px-4 sm:px-6 md:px-8 pb-3.5 md:pb-5 pt-[calc(0.875rem+env(safe-area-inset-top))] md:pt-[calc(1.25rem+env(safe-area-inset-top))] flex justify-between items-center transition-colors duration-300 ${
          scrolled
            ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-black/5 dark:border-white/10'
            : 'bg-transparent border-b border-transparent backdrop-blur-xs md:backdrop-blur-none'
        }`}
      >
        {/* Logo dengan Cormorant Garamond */}
        <Link href="/" className="font-serif text-3xl font-medium tracking-tighter italic text-black dark:text-white">
          Blackhand<span className="text-zinc-500 dark:text-zinc-600 italic">.</span>
        </Link>

        {/* Menu Navigasi Desktop dengan Poppins */}
        <div className="hidden md:flex items-center space-x-10 font-sans text-xs font-bold tracking-[0.15em] uppercase text-black dark:text-white">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`py-2 transition-colors ${
                pathname === link.href
                  ? 'text-violet-600 dark:text-violet-400'
                  : 'hover:text-black/60 dark:hover:text-white/60'
              }`}
            >
              {link.label}
            </Link>
          ))}
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
          
          {/* Desktop user controls */}
          {user ? (
            <div className="hidden md:flex items-center space-x-3">
              <span className="font-sans text-xs text-black dark:text-white hidden sm:block truncate max-w-[150px]">
                {user.email?.substring(0, 5).toUpperCase()}
              </span>
              {isAdmin(user) && (
                <Link 
                  href="/admin"
                  className="py-2 font-sans text-xs font-bold text-black dark:text-white hover:text-black/60 dark:hover:text-white/60 transition-colors flex items-center gap-1"
                >
                  <Settings size={14} strokeWidth={2} />
                  <span className="hidden sm:block">Admin</span>
                </Link>
              )}
              <button 
                onClick={handleLogout}
                className="py-2 font-sans text-xs font-bold text-black dark:text-white hover:text-black/60 dark:hover:text-white/60 transition-colors"
              >
                Logout
              </button>
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
                  pathname === link.href
                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                    : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}

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