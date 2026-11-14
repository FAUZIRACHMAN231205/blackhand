import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Toko',
  description: 'Aksesori dan merchandise resmi Blackhand, dengan ongkos kirim flat.',
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
