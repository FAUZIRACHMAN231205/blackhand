'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '../component/Navbar';
import AuthModal from '../component/AuthModal';

export default function Manifesto() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <Navbar onOpenModal={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="min-h-[100dvh] bg-white px-6 pb-24 pt-28 text-black transition-colors duration-300 dark:bg-slate-950 dark:text-white sm:px-10 md:px-16 md:pt-36">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 font-sans text-[10px] font-black uppercase tracking-[0.4em] text-violet-500">
            Manifesto
          </p>
          <h1 className="mb-10 font-serif text-4xl italic font-medium leading-[1.05] sm:text-5xl md:text-6xl">
            Bayangan bukan kekosongan.
            <br />
            Ia adalah <span className="text-violet-500">bentuk</span> yang belum selesai diucap.
          </h1>

          <div className="space-y-8 font-sans text-base leading-relaxed text-black/70 dark:text-white/70 sm:text-lg">
            <p>
              Blackhand lahir dari dorongan yang sama tuanya dengan seni itu sendiri: mengubah yang gelap
              menjadi sesuatu yang bisa dipegang, dipandang, dan dibawa pulang. Setiap goresan, setiap jahitan
              pada merchandise kami, adalah upaya menahan sejenak apa yang biasanya hanya lewat di sudut mata.
            </p>
            <p>
              Kami tidak membuat karya untuk menenangkan ruangan. Kami membuatnya untuk mengingatkan bahwa
              keindahan tidak selalu datang dengan cahaya terang — kadang ia butuh bayangan untuk punya bentuk
              sama sekali.
            </p>
            <p>
              Dua hal yang kami kerjakan, satu jiwa yang sama: <strong className="text-black dark:text-white">karya</strong> yang
              lahir dari studio, dan <strong className="text-black dark:text-white">merchandise</strong> yang
              membawa sebagian dari dunia itu keluar dari galeri, ke tangan Anda.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 border-t border-black/10 pt-10 dark:border-white/10 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 font-serif text-xl italic">Studio</h2>
              <p className="font-sans text-sm text-black/60 dark:text-white/60">
                Setiap karya dipublikasikan sebagai bagian dari arsip yang terus bertambah — sebagian untuk
                dipandang, sebagian untuk dimiliki.
              </p>
            </div>
            <div>
              <h2 className="mb-2 font-serif text-xl italic">Etalase</h2>
              <p className="font-sans text-sm text-black/60 dark:text-white/60">
                Merchandise edisi terbatas, dibuat untuk bertahan lama — sama seperti kesan yang ingin kami
                tinggalkan.
              </p>
            </div>
          </div>

          <div className="mt-16 flex flex-wrap gap-3">
            <Link
              href="/works"
              className="rounded-xl bg-black px-7 py-4 font-sans text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:opacity-90 dark:bg-white dark:text-black"
            >
              Jelajahi Karya
            </Link>
            <Link
              href="/shop"
              className="rounded-xl border border-black/15 px-7 py-4 font-sans text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Lihat Merchandise
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
