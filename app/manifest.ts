import type { MetadataRoute } from 'next';
import { BRAND_BACKGROUND } from './lib/brandIcon';

/** What lets phones install Blackhand to the home screen and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Blackhand — Art & Merchandise',
    short_name: 'Blackhand',
    description: 'Galeri karya seni Blackhand, koleksi eksklusif satu pemilik, dan merchandise resmi.',
    lang: 'id',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: BRAND_BACKGROUND,
    theme_color: BRAND_BACKGROUND,
    categories: ['art', 'shopping', 'lifestyle'],
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/maskable-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Long-press the app icon on Android to jump straight in.
    shortcuts: [
      { name: 'Collection', short_name: 'Collection', url: '/gallery' },
      { name: 'Shop', short_name: 'Shop', url: '/shop' },
      { name: 'Pesanan Saya', short_name: 'Pesanan', url: '/orders' },
    ],
  };
}
