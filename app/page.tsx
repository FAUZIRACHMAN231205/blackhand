'use client';

import { useState } from 'react';
import Navbar from './component/Navbar';
import AuthModal from './component/AuthModal'; // Import modal baru
import Image from 'next/image';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Navbar onOpenModal={() => setIsModalOpen(true)} />
      
      <main className="relative min-h-[100dvh] w-full flex items-center justify-center bg-black p-6 md:p-20">
        <div className="relative w-full h-[30vh] md:h-[50vh] max-w-[1100px]">
          <Image 
            src="/background.jpeg" 
            alt="Blackhand Background"
            fill
            className="object-contain"
            priority
            draggable={false}
          />
        </div>
      </main>

      {/* Tampilkan Modal di sini */}
      <AuthModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}