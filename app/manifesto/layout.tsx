import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manifesto',
  description: 'Bayangan bukan kekosongan. Tentang studio Blackhand.',
};

export default function ManifestoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
