'use client';

import { useState } from 'react';
import Navbar from '../component/Navbar';
import AuthModal from '../component/AuthModal';
import SiteFooter from '../component/SiteFooter';
import { Button } from '../component/ui';

export default function Manifesto() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <Navbar onOpenModal={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="min-h-[100dvh] bg-paper px-4 pb-24 pt-28 text-ink sm:px-6 md:px-8 md:pt-36">
        <article className="mx-auto grid max-w-4xl gap-12">
          <header className="grid gap-5 border-b border-ink pb-8">
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mute">Manifesto</p>
            <h1 className="text-balance font-sans text-4xl font-bold uppercase leading-[0.95] tracking-[-0.03em] sm:text-6xl">
              Bayangan bukan kekosongan.
            </h1>
            <p className="font-serif text-2xl italic leading-snug text-mute sm:text-3xl">
              Ia adalah bentuk yang belum selesai diucap.
            </p>
          </header>

          <div className="grid max-w-prose gap-6 font-sans text-base leading-relaxed text-ink sm:text-lg">
            <p>
              Blackhand lahir dari dorongan yang sama tuanya dengan seni itu sendiri: mengubah yang gelap menjadi
              sesuatu yang bisa dipegang, dipandang, dan dibawa pulang. Setiap goresan, setiap jahitan pada merchandise
              kami, adalah upaya menahan sejenak apa yang biasanya hanya lewat di sudut mata.
            </p>
            <p>
              Kami tidak membuat karya untuk menenangkan ruangan. Kami membuatnya untuk mengingatkan bahwa keindahan
              tidak selalu datang dengan cahaya terang — kadang ia butuh bayangan untuk punya bentuk sama sekali.
            </p>
            <p>
              Dua hal yang kami kerjakan, satu jiwa yang sama: <strong>karya</strong> yang lahir dari studio, dan{' '}
              <strong>merchandise</strong> yang membawa sebagian dari dunia itu keluar dari galeri, ke tangan Anda.
            </p>
          </div>

          <div className="grid gap-8 border-t border-ink pt-8 sm:grid-cols-2">
            <section className="grid gap-2">
              <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em]">Studio</h2>
              <p className="font-sans text-sm leading-relaxed text-mute">
                Setiap karya dipublikasikan sebagai bagian dari arsip yang terus bertambah — sebagian untuk dipandang,
                sebagian untuk dimiliki satu orang saja.
              </p>
            </section>
            <section className="grid gap-2">
              <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em]">Toko</h2>
              <p className="font-sans text-sm leading-relaxed text-mute">
                Merchandise edisi terbatas, dibuat untuk bertahan lama — sama seperti kesan yang ingin kami tinggalkan.
              </p>
            </section>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button href="/gallery">Lihat karya</Button>
            <Button variant="secondary" href="/shop">
              Ke toko
            </Button>
          </div>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
