import type { Metadata } from 'next';
import AccountShell from './AccountShell';

export const metadata: Metadata = {
  title: 'Akun',
  // Personal pages: nothing for search engines here.
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
