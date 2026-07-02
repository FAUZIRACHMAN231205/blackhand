'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Search, LogOut, Settings, Moon, Sun } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isAdmin } from '../lib/adminUtils';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  onOpenModal: () => void;
}

export default function Navbar({ onOpenModal }: NavbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <nav className="fixed top-0 w-full z-[100] bg-transparent px-8 py-5 flex justify-between items-center">
      {/* Logo dengan Cormorant Garamond */}
      <Link href="/" className="font-serif text-3xl font-medium tracking-tighter italic text-black dark:text-white">
        Blackhand<span className="text-zinc-500 dark:text-zinc-600 italic">.</span>
      </Link>

      {/* Menu Navigasi dengan Poppins */}
      <div className="hidden md:flex items-center space-x-10 font-sans text-xs font-bold tracking-[0.15em] uppercase text-black dark:text-white">
        <Link href="/works" className="hover:text-black/60 dark:hover:text-white/60 transition-colors">Feed</Link>
        <Link href="/gallery" className="hover:text-black/60 dark:hover:text-white/60 transition-colors">Collection</Link>
      </div>

      {/* Ikon Pengguna & Tools */}
      <div className="flex items-center space-x-6">
        <button className="text-black dark:text-white hover:text-black/60 dark:hover:text-white/60 transition-colors">
          <Search size={18} strokeWidth={1.5} />
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="text-black dark:text-white hover:text-black/60 dark:hover:text-white/60 transition-colors"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
        </button>
        
        {user ? (
          <div className="flex items-center space-x-3">
            <span className="font-sans text-xs text-black dark:text-white hidden sm:block truncate max-w-[150px]">
              {user.email?.substring(0, 5).toUpperCase()}
            </span>
            {isAdmin(user.email) && (
              <Link 
                href="/admin"
                className="font-sans text-xs font-bold text-black dark:text-white hover:text-black/60 dark:hover:text-white/60 transition-colors flex items-center gap-1"
              >
                <Settings size={14} strokeWidth={2} />
                <span className="hidden sm:block">Admin</span>
              </Link>
            )}
            <button 
              onClick={handleLogout}
              className="font-sans text-xs font-bold text-black dark:text-white hover:text-black/60 dark:hover:text-white/60 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={onOpenModal}
            className="flex items-center space-x-2 font-sans text-xs font-bold tracking-[0.15em] uppercase text-black dark:text-white hover:text-black/60 dark:hover:text-white/60 transition-colors"
          >
            <User size={16} strokeWidth={2} />
            <span className="hidden sm:block">
              My Account
            </span>
          </button>
        )}
      </div>
    </nav>
  );
}