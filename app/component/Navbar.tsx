'use client';

import Link from 'next/link';
import { User, Search, ShoppingBag } from 'lucide-react';

interface NavbarProps {
  onOpenModal: () => void;
}

export default function Navbar({ onOpenModal }: NavbarProps) {
  return (
    <nav className="fixed top-0 w-full z-[100] bg-black/50 backdrop-blur-md border-b border-white/5 px-8 py-5 flex justify-between items-center">
      {/* Logo dengan Cormorant Garamond */}
      <Link href="/" className="font-serif text-3xl font-medium tracking-tighter italic">
        Blackhand<span className="text-zinc-500 italic">.</span>
      </Link>

      {/* Menu Navigasi dengan Poppins */}
      <div className="hidden md:flex items-center space-x-10 font-sans text-[10px] font-bold tracking-[0.3em] uppercase">
        <Link href="/shop" className="hover:text-zinc-400 transition-colors">Shop</Link>
        <Link href="/archive" className="hover:text-zinc-400 transition-colors">Archive</Link>
        <Link href="/about" className="hover:text-zinc-400 transition-colors">About</Link>
      </div>

      {/* Ikon Pengguna & Tools */}
      <div className="flex items-center space-x-6">
        <button className="text-white hover:text-zinc-400 transition-colors">
          <Search size={18} strokeWidth={1.5} />
        </button>
        
        <button 
          onClick={onOpenModal}
          className="group flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white hover:text-black transition-all duration-300"
        >
          <User size={16} strokeWidth={2} />
          <span className="font-sans text-[9px] font-black uppercase tracking-widest hidden sm:block">
            Identity
          </span>
        </button>
      </div>
    </nav>
  );
}