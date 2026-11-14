import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Karya',
  description: 'Arsip karya studio Blackhand. Setiap karya dijual kepada satu pemilik saja.',
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
