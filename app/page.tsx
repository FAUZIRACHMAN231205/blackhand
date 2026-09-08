'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from './component/Navbar';
import AuthModal from './component/AuthModal';
import { useAuth } from './hooks/useAuth';
import Image from 'next/image';

function HomeContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stayAtHome = searchParams.get('home') === 'true';

  useEffect(() => {
    // Redirect ke dashboard jika sudah login (kecuali jika user memilih stay at home)
    if (!loading && user && !stayAtHome) {
      router.push('/dashboard');
    }
  }, [user, loading, router, stayAtHome]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black dark:bg-slate-950">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Navbar onOpenModal={() => setIsModalOpen(true)} />
      
      <main className="relative w-full h-[100dvh] overflow-hidden bg-white dark:bg-slate-950">

        {/* Satu gambar responsif untuk semua ukuran layar. next/image otomatis
            menyajikan varian kecil ke mobile via `sizes`. Untuk seni terarah
            (crop potret khusus mobile), tambahkan kembali aset arte-mobile.jpeg
            dan pisahkan dengan <picture>/breakpoint. */}
        <div className="absolute inset-0">
          <Image
            src="/arte.jpeg"
            alt="Blackhand Background"
            fill
            sizes="100vw"
            className="object-cover object-center dark:opacity-85"
            priority
            draggable={false}
          />
        </div>

        {/* Enhanced Dark Art Vignette Overlay */}
        <div className="absolute inset-0 bg-black/10 dark:bg-black/30 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/40 to-black/95 dark:via-black/60 dark:to-black/100 pointer-events-none" />
      </main>

      {/* Tampilkan Modal di sini */}
      <AuthModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black dark:bg-slate-950"><div className="text-white text-xl">Loading...</div></div>}>
      <HomeContent />
    </Suspense>
  );
}