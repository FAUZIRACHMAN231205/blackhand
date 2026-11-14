'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from '../component/Navbar';
import SiteFooter from '../component/SiteFooter';
import { PageHeader, TabLinks } from '../component/ui';
import { useAuth } from '../hooks/useAuth';
import { ACCOUNT_TABS } from '../lib/routes';
import { AccountContext } from './AccountContext';

/**
 * Akun: one page with tabs — Koleksi, Pesanan, Profil. Each tab is its own
 * address (/account, /account/orders, /account/profile) so it can be linked
 * to directly, e.g. from a payment redirect.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // proxy.ts already turns away visitors without a session cookie; this
  // catches a cookie that has expired or been revoked.
  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [user, loading, router]);

  return (
    <>
      <Navbar onOpenModal={() => {}} />

      <main className="min-h-[100dvh] bg-paper px-4 pb-20 pt-20 text-ink sm:px-6 md:px-8 md:pt-28">
        <div className="mx-auto grid max-w-5xl gap-8">
          {user ? (
            <>
              <PageHeader
                eyebrow="Akun"
                title={user.full_name || 'Akun saya'}
                description={<span className="[overflow-wrap:anywhere]">{user.email}</span>}
              />
              <TabLinks label="Bagian akun" items={ACCOUNT_TABS} current={pathname} />
              <AccountContext.Provider value={{ user, refresh }}>{children}</AccountContext.Provider>
            </>
          ) : (
            <div className="grid gap-6" aria-busy="true" aria-label="Memuat akun">
              <div className="h-24 animate-pulse bg-sheet" />
              <div className="h-11 animate-pulse bg-sheet" />
              <div className="h-64 animate-pulse bg-sheet" />
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
