'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from './component/Navbar';
import AuthModal from './component/AuthModal';
import { useAuth } from './hooks/useAuth';
import Image from 'next/image';

export default function Home() {
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Navbar onOpenModal={() => setIsModalOpen(true)} />
      
      <main className="relative w-full h-screen overflow-hidden">
        <Image 
          src="/arte.jpeg" 
          alt="Blackhand Background"
          fill
          className="object-cover"
          priority
          draggable={false}
        />
      </main>

      {/* Tampilkan Modal di sini */}
      <AuthModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}