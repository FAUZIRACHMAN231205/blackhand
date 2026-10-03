'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { isAdmin } from '../lib/adminUtils';
import { formatIdr } from '../lib/categories';
import Navbar from '../component/Navbar';
import { LoadingSpinner } from '../component/LoadingStates';
import {
  Plus,
  Edit2,
  Images,
  BadgeCheck,
  ShoppingBag,
  Truck,
  AlertTriangle,
  Wallet,
  Package,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalWorks: number;
  totalImages: number;
  soldWorks: number;
  totalProducts: number;
  ordersToShip: number;
  needsRefund: number;
  revenueIdr: number;
}

const EMPTY_STATS: Stats = {
  totalWorks: 0,
  totalImages: 0,
  soldWorks: 0,
  totalProducts: 0,
  ordersToShip: 0,
  needsRefund: 0,
  revenueIdr: 0,
};

const cardClass =
  'bg-white/80 dark:bg-zinc-950/60 border border-black/5 dark:border-white/10 rounded-2xl backdrop-blur-sm transition-colors';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    // Redirect jika belum login atau bukan admin
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (!isAdmin(user)) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !isAdmin(user)) return;
    let ignore = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        if (!ignore) setStats({ ...EMPTY_STATS, ...data });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        if (!ignore) setLoadingStats(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || !isAdmin(user)) {
    return null;
  }

  const statCards = [
    { label: 'Works', value: stats.totalWorks, sub: `${stats.totalImages} images`, icon: Images },
    { label: 'Sold Works', value: stats.soldWorks, sub: 'Each to a single buyer', icon: BadgeCheck },
    { label: 'Products', value: stats.totalProducts, sub: 'In the shop', icon: ShoppingBag },
    { label: 'To Ship', value: stats.ordersToShip, sub: 'Paid merch orders', icon: Truck },
    { label: 'Revenue', value: formatIdr(stats.revenueIdr), sub: 'Paid works + merch', icon: Wallet },
  ];

  const actions = [
    { href: '/admin/works/create', title: 'Upload New Work', text: 'Create a new album with up to 6 images', icon: Plus },
    { href: '/admin/works', title: 'Manage Works', text: 'Edit works, prices and availability', icon: Edit2 },
    { href: '/admin/products', title: 'Products', text: 'Merchandise, stock, photos and shipping fee', icon: Package },
    { href: '/admin/orders', title: 'Orders & Sales', text: 'Ship merch orders, see who bought each work', icon: Receipt },
  ];

  return (
    <>
      <Navbar onOpenModal={() => {}} />

      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-6 md:p-20 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl italic font-medium mb-2">Admin Panel</h1>
            <p className="font-sans text-sm text-black/60 dark:text-white/60">
              Welcome, <span className="text-black/80 dark:text-white/80">{user.email}</span>
            </p>
          </div>

          {stats.needsRefund > 0 && (
            <Link
              href="/admin/orders"
              className="mb-8 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 px-5 py-4 text-rose-800 transition-colors hover:bg-rose-500/10 dark:text-rose-300"
            >
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span className="font-sans text-sm">
                <strong>{stats.needsRefund} payment{stats.needsRefund === 1 ? '' : 's'} need a refund.</strong>{' '}
                Money arrived for a work that was already sold, or for merchandise that had run out. Find them
                under Orders &amp; Sales (Merchandise → To do, or Artwork sales → Needs refund) and refund them
                in the Midtrans dashboard.
              </span>
            </Link>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8 sm:mb-12">
            {statCards.map((stat, index) => (
              // Five cards in two columns: the last (revenue, the widest number)
              // takes a full row on phones instead of being cut off.
              <div
                key={stat.label}
                className={`${cardClass} p-4 sm:p-5 shadow-sm ${
                  index === statCards.length - 1 ? 'col-span-2 lg:col-span-1' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10 text-violet-500 dark:text-violet-400 shrink-0">
                    <stat.icon size={16} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-black/60 dark:text-white/60">
                    {stat.label}
                  </h3>
                </div>
                <p className="font-serif text-2xl sm:text-3xl italic text-black dark:text-white truncate">
                  {loadingStats ? '···' : stat.value}
                </p>
                <p className="font-sans text-[11px] text-black/50 dark:text-white/50 mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>

          <div className="mb-12">
            <h2 className="font-serif text-2xl italic mb-6 text-black/80 dark:text-white/80">Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {actions.map((action) => (
                <Link key={action.href} href={action.href} className="group">
                  <div className={`${cardClass} p-8 hover:border-violet-500/30 dark:hover:border-violet-500/30 hover:shadow-lg`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-500 dark:text-violet-400">
                        <action.icon size={20} strokeWidth={1.5} />
                      </div>
                      <h3 className="font-serif text-xl italic">{action.title}</h3>
                    </div>
                    <p className="font-sans text-sm text-black/60 dark:text-white/60">{action.text}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 rounded-2xl p-8">
            <h3 className="font-serif text-lg italic mb-4">How selling works</h3>
            <ul className="space-y-3 font-sans text-sm text-black/70 dark:text-white/70">
              <li>&bull; Every image of every published work is visible to everyone, unblurred.</li>
              <li>
                &bull; A work for sale is sold to <strong>one buyer only</strong>. While someone pays, it is held
                for them for 30 minutes; once paid it shows as <em>Terjual</em> and nobody else can buy or
                download it.
              </li>
              <li>&bull; The buyer downloads the full-resolution originals as JPG, ZIP, PDF or to Google Drive.</li>
              <li>
                &bull; Merchandise is bought directly with a flat shipping fee. Stock is held during payment and
                returned automatically if the payment does not finish.
              </li>
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
