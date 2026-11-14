'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from '../component/Navbar';
import { TabLinks } from '../component/ui';
import { useAuth } from '../hooks/useAuth';
import { isAdmin } from '../lib/adminUtils';
import { ACCOUNT_HOME, ADMIN_TABS, activeTab } from '../lib/routes';
import { AdminContext } from './_components/AdminContext';

/**
 * Every admin page: the admin check, the site navigation and the admin tabs
 * (Ringkasan · Karya · Produk · Pesanan). Pages render only their own content.
 * Same parts as the public site, set denser.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = isAdmin(user);

  // proxy.ts already turns away non-admins with a valid cookie; this catches
  // an expired session or a role that changed since the cookie was issued.
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/?masuk=1');
    else if (!allowed) router.replace(ACCOUNT_HOME);
  }, [user, loading, allowed, router]);

  return (
    <>
      <Navbar onOpenModal={() => {}} />

      <main className="min-h-[100dvh] bg-paper px-4 pb-20 pt-20 text-ink sm:px-6 md:px-8 md:pt-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8">
          <TabLinks label="Admin" items={ADMIN_TABS} current={activeTab(pathname, ADMIN_TABS)} />
          {user && allowed ? (
            <AdminContext.Provider value={{ user }}>{children}</AdminContext.Provider>
          ) : (
            <div className="grid gap-6" aria-busy="true" aria-label="Memeriksa akses admin">
              <div className="h-20 animate-pulse bg-sheet" />
              <div className="h-64 animate-pulse bg-sheet" />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
