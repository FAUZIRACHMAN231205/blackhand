'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Search, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isAdmin } from '../lib/adminUtils';

interface NavbarProps {
  onOpenModal: () => void;
}

export default function Navbar({ onOpenModal }: NavbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <nav className="fixed top-0 w-full z-[100] bg-transparent px-8 py-5 flex justify-between items-center">
      {/* Logo dengan Cormorant Garamond */}
      <Link href="/" className="font-serif text-3xl font-medium tracking-tighter italic text-black">
        Blackhand<span className="text-zinc-500 italic">.</span>
      </Link>

      {/* Menu Navigasi dengan Poppins */}
      <div className="hidden md:flex items-center space-x-10 font-sans text-xs font-bold tracking-[0.15em] uppercase text-black">
        <Link href="/shop" className="hover:text-black/60 transition-colors">New</Link>
        <Link href="/archive" className="hover:text-black/60 transition-colors">Collection</Link>
        <Link href="/about" className="hover:text-black/60 transition-colors">Access</Link>
      </div>

      {/* Ikon Pengguna & Tools */}
      <div className="flex items-center space-x-6">
        <button className="text-black hover:text-black/60 transition-colors">
          <Search size={18} strokeWidth={1.5} />
        </button>
        
        {user ? (
          <div className="flex items-center space-x-3">
            <span className="font-sans text-xs text-black hidden sm:block truncate max-w-[150px]">
              {user.email?.substring(0, 5).toUpperCase()}
            </span>
            {isAdmin(user.email) && (
              <Link 
                href="/admin"
                className="font-sans text-xs font-bold text-black hover:text-black/60 transition-colors flex items-center gap-1"
              >
                <Settings size={14} strokeWidth={2} />
                <span className="hidden sm:block">Admin</span>
              </Link>
            )}
            <button 
              onClick={handleLogout}
              className="font-sans text-xs font-bold text-black hover:text-black/60 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={onOpenModal}
            className="flex items-center space-x-2 font-sans text-xs font-bold tracking-[0.15em] uppercase text-black hover:text-black/60 transition-colors"
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