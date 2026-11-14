'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '../../component/Navbar';
import AuthModal from '../../component/AuthModal';
import SiteFooter from '../../component/SiteFooter';
import RatingStars from '../../component/RatingStars';
import CommentSection from '../../component/CommentSection';
import AlbumPurchase from '../../component/AlbumPurchase';
import { Button, EmptyState, ImageViewer, Tag } from '../../component/ui';
import { useAuth } from '../../hooks/useAuth';
import { useAlbumAccess } from '../../hooks/useAlbumAccess';
import { supabase } from '../../lib/supabaseClient';
import { isAdmin as checkAdmin } from '../../lib/adminUtils';
import type { Work, WorkImage } from '../../types';

const LONG_DESCRIPTION = 400;

type LoadState = 'loading' | 'ready' | 'missing' | 'failed';

/** The published work and its images, in display order. */
async function loadWork(workId: string): Promise<{ state: LoadState; work?: Work; images?: WorkImage[] }> {
  const { data: work, error } = await supabase
    .from('works')
    .select('*')
    .eq('id', workId)
    .eq('is_published', true)
    .maybeSingle();
  if (error) {
    console.error('Error fetching work:', error);
    return { state: 'failed' };
  }
  if (!work) return { state: 'missing' };

  const { data: images, error: imagesError } = await supabase
    .from('work_images')
    .select('*')
    .eq('work_id', workId)
    .order('display_order', { ascending: true });
  if (imagesError) console.error('Error fetching images:', imagesError);

  return { state: 'ready', work: work as Work, images: (images ?? []) as WorkImage[] };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function WorkDetail() {
  const { user } = useAuth();
  const params = useParams();
  const workId = params.id as string;

  const [state, setState] = useState<LoadState>('loading');
  const [work, setWork] = useState<Work | null>(null);
  const [images, setImages] = useState<WorkImage[]>([]);
  const [current, setCurrent] = useState(0);
  const [ratingsVersion, setRatingsVersion] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { sale, unlockedUrls, refresh: refreshAccess } = useAlbumAccess(workId, Boolean(user));

  useEffect(() => {
    // Public page: the work loads regardless of sign-in.
    let ignore = false;
    loadWork(workId).then((result) => {
      if (ignore) return;
      setState(result.state);
      setWork(result.work ?? null);
      setImages(result.images ?? []);
      setCurrent(0);
    });
    return () => {
      ignore = true;
    };
  }, [workId]);

  const body = () => {
    if (state === 'loading') {
      return (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" aria-busy="true" aria-label="Memuat karya">
          <div className="aspect-[4/3] animate-pulse bg-sheet" />
          <div className="grid content-start gap-4">
            <div className="h-12 w-3/4 animate-pulse bg-sheet" />
            <div className="h-32 animate-pulse bg-sheet" />
          </div>
        </div>
      );
    }

    if (state !== 'ready' || !work) {
      return (
        <EmptyState
          title={state === 'missing' ? 'Karya tidak ditemukan' : 'Karya gagal dimuat'}
          description={
            state === 'missing'
              ? 'Karya ini mungkin sudah tidak dipublikasikan, atau alamatnya salah.'
              : 'Periksa koneksi Anda, lalu muat ulang halaman.'
          }
          action={<Button href="/gallery">Kembali ke karya</Button>}
        />
      );
    }

    // Everyone sees every image; the owner sees the full-resolution originals.
    const viewerImages = images.map((img) => ({ id: img.id, url: unlockedUrls[img.id] ?? img.image_url }));
    if (viewerImages.length === 0 && work.featured_image_url) {
      viewerImages.push({ id: 'cover', url: work.featured_image_url });
    }
    const currentImage = images[current];
    const sold = sale ? sale.status === 'sold' : Boolean(work.sold_at);
    const owned = sale?.status === 'owned';
    const isLong = (work.description?.length ?? 0) > LONG_DESCRIPTION;

    return (
      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <ImageViewer images={viewerImages} index={current} onIndexChange={setCurrent} alt={work.title} />
        </div>

        {/* Right column on desktop; directly under the image on phones. */}
        <aside className="grid min-w-0 gap-6 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <header className="grid gap-3 border-b border-ink pb-5">
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mute">{work.category}</p>
            <h1 className="break-words font-serif text-4xl font-medium italic leading-tight text-ink sm:text-5xl">
              {work.title}
            </h1>
            {(owned || sold || work.is_featured) && (
              <div className="flex flex-wrap gap-2">
                {owned ? <Tag>Milik Anda</Tag> : sold ? <Tag variant="solid">Terjual</Tag> : null}
                {work.is_featured && <Tag>Pilihan</Tag>}
              </div>
            )}
          </header>

          <AlbumPurchase
            workId={workId}
            imageCount={images.length}
            priceIdr={work.price_idr ?? null}
            sale={sale}
            isLoggedIn={Boolean(user)}
            onRequireAuth={() => setAuthOpen(true)}
            onChanged={refreshAccess}
            currentImageId={currentImage?.id}
            currentPosition={current + 1}
          />

          <dl className="grid gap-2 border-t border-line pt-4 font-sans text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Gambar</dt>
              <dd className="tabular-nums">{images.length || 1}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-mute">Dipublikasikan</dt>
              <dd>{formatDate(work.created_at)}</dd>
            </div>
          </dl>
        </aside>

        <div className="grid min-w-0 gap-12 lg:col-start-1 lg:row-start-2">
          {work.description && (
            <section className="grid gap-3" aria-labelledby="about-work">
              <h2 id="about-work" className="border-b border-ink pb-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em]">
                Tentang karya ini
              </h2>
              <p
                className={`max-w-prose whitespace-pre-wrap font-sans text-base leading-relaxed text-ink ${
                  !descExpanded && isLong ? 'line-clamp-6' : ''
                }`}
              >
                {work.description}
              </p>
              {isLong && (
                <div>
                  <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setDescExpanded((v) => !v)}>
                    {descExpanded ? 'Ringkas' : 'Selengkapnya'}
                  </Button>
                </div>
              )}
            </section>
          )}

          <section className="grid gap-3" aria-labelledby="rating-work">
            <h2 id="rating-work" className="border-b border-ink pb-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em]">
              Rating
            </h2>
            <RatingStars
              workId={workId}
              userId={user?.id}
              readOnly={!user}
              onRate={() => setRatingsVersion((v) => v + 1)}
            />
          </section>

          <CommentSection
            workId={workId}
            userId={user?.id}
            isAdmin={user ? checkAdmin(user) : false}
            ratingsVersion={ratingsVersion}
            onRequireAuth={() => setAuthOpen(true)}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <Navbar onOpenModal={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <main className="min-h-[100dvh] bg-paper px-4 pb-20 pt-20 text-ink sm:px-6 md:px-8 md:pt-24">
        <div className="mx-auto grid max-w-7xl gap-6">
          <div>
            <Button variant="ghost" size="sm" href="/gallery" className="-ml-2">
              ← Kembali ke karya
            </Button>
          </div>
          {body()}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
