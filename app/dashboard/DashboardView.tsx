'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronDown,
  Copy,
  Check,
  Sun,
  Moon,
  Info,
  Pencil,
  Library,
  Package,
  Images,
  ShoppingBag,
  Settings,
  LifeBuoy,
  ArrowRight,
} from 'lucide-react';
import Navbar from '../component/Navbar';
import SupportModal from '../component/SupportModal';
import type { User } from '../types';

function formatDate(dateString: string | undefined, withTime = false) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime && { hour: '2-digit', minute: '2-digit' }),
  });
}

function getGreeting() {
  const hours = new Date().getHours();
  if (hours < 12) return { text: 'Selamat Pagi', icon: <Sun className="text-amber-500" size={16} /> };
  if (hours < 15) return { text: 'Selamat Siang', icon: <Sun className="text-orange-500" size={16} /> };
  if (hours < 18) return { text: 'Selamat Sore', icon: <Sun className="text-yellow-600" size={16} /> };
  return { text: 'Selamat Malam', icon: <Moon className="text-indigo-400" size={16} /> };
}

/** How many owned works and merch orders to show on the shortcuts; null until known. */
function useCounts() {
  const [albums, setAlbums] = useState<number | null>(null);
  const [orders, setOrders] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch('/api/me/albums')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data) setAlbums((data.workIds ?? []).length);
      })
      .catch(() => {});
    fetch('/api/me/product-orders')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data) setOrders((data.orders ?? []).length);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  return { albums, orders };
}

// Phones: icon above the text, so the full tile width goes to the words.
// Wider screens: icon beside the text, with an arrow.
const tileClass =
  'group flex min-h-[76px] flex-col items-start gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-3.5 text-left backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-md dark:border-slate-800/50 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:gap-3 sm:p-4';

function Tile({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 sm:h-10 sm:w-10">
        {icon}
      </span>
      <span className="min-w-0 w-full flex-1">
        <span className="block font-sans text-sm font-bold leading-tight text-black dark:text-white sm:truncate">
          {title}
        </span>
        <span className="mt-0.5 line-clamp-2 block font-sans text-[11px] leading-snug text-slate-500 dark:text-slate-400 sm:truncate">
          {sub}
        </span>
      </span>
      <ArrowRight
        size={14}
        className="hidden shrink-0 text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:text-violet-500 sm:block"
      />
    </>
  );
}

/** The signed-in member's home: who they are, their account at a glance, and where to go next. */
export default function DashboardView({ user }: { user: User }) {
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copied, setCopied] = useState(false);
  const { albums, orders } = useCounts();
  // Read the clock once, not on every render.
  const [now] = useState(() => Date.now());

  const accountAge = user.created_at
    ? Math.floor((now - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const greeting = getGreeting();
  const displayName = user.full_name || user.email;
  const providerLabel = user.provider === 'google' ? 'Google' : 'Email OTP';

  const handleCopyId = () => {
    if (!user.id) return;
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortcuts = [
    {
      href: '/albums',
      icon: <Library size={18} />,
      title: 'Album Saya',
      sub: albums === null ? 'Karya yang Anda miliki' : albums > 0 ? `${albums} karya dimiliki` : 'Belum ada karya',
    },
    {
      href: '/orders',
      icon: <Package size={18} />,
      title: 'Pesanan Saya',
      sub: orders === null ? 'Status & resi merchandise' : orders > 0 ? `${orders} pesanan` : 'Belum ada pesanan',
    },
    { href: '/gallery', icon: <Images size={18} />, title: 'Collection', sub: 'Jelajahi karya' },
    { href: '/shop', icon: <ShoppingBag size={18} />, title: 'Shop', sub: 'Merchandise resmi' },
    { href: '/settings', icon: <Settings size={18} />, title: 'Settings', sub: 'Profil & akun' },
  ];

  const facts = [
    { label: 'Bergabung', value: formatDate(user.created_at) },
    { label: 'Login terakhir', value: formatDate(user.last_sign_in_at) },
    { label: 'Status', value: 'Aktif', tone: 'text-emerald-600 dark:text-emerald-400' },
  ];

  return (
    <>
      <Navbar onOpenModal={() => {}} />

      <main className="relative min-h-[100dvh] overflow-hidden bg-white px-4 pb-16 pt-20 text-black transition-colors duration-300 dark:bg-slate-950 dark:text-white sm:px-6 md:px-10 md:pt-28">
        {/* Ambient background */}
        <div className="pointer-events-none absolute left-1/4 top-10 h-96 w-96 animate-float-slow rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-600/5" />
        <div className="pointer-events-none absolute right-1/4 top-1/3 h-96 w-96 animate-float-slow-reverse rounded-full bg-fuchsia-400/10 blur-3xl dark:bg-fuchsia-600/5" />

        <div className="relative z-10 mx-auto max-w-4xl space-y-6 sm:space-y-8">
          <Link
            href="/?home=true"
            className="group -ml-1 inline-flex min-h-[44px] items-center gap-1.5 px-1 font-sans text-sm font-semibold text-black/60 transition-colors hover:text-black dark:text-white/60 dark:hover:text-white"
          >
            <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>

          {/* Header */}
          <header className="-mt-2">
            <p className="mb-1 flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {greeting.icon}
              {greeting.text}
            </p>
            <h1 className="font-serif text-3xl font-medium italic tracking-tight sm:text-4xl md:text-5xl">
              Your Digital Identity
            </h1>
          </header>

          {/* Profile */}
          <section className="rounded-3xl border border-slate-200/60 bg-gradient-to-br from-slate-50/60 via-white to-slate-50/60 p-4 shadow-sm dark:border-slate-800/45 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-950/80 sm:p-6">
            <div className="flex items-center gap-4 sm:gap-6">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                referrerPolicy="no-referrer"
                className="h-14 w-14 shrink-0 rounded-full border-2 border-white object-cover shadow-md ring-2 ring-violet-500/30 dark:border-slate-900 sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 font-serif text-2xl font-bold text-white shadow-md ring-2 ring-violet-500/30 sm:h-20 sm:w-20 sm:text-3xl">
                {(displayName || 'B').charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              {/* Three lines: a long uppercase name needs them on the narrowest phones. */}
              <h2 className="line-clamp-3 break-words font-serif text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
                {displayName}
              </h2>
              {user.full_name && (
                // Long campus addresses wrap instead of being cut off.
                <p className="mt-0.5 font-sans text-xs text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400 sm:text-sm">
                  {user.email}
                </p>
              )}
            </div>

            <Link
              href="/settings"
              className="hidden h-11 shrink-0 items-center gap-2 rounded-xl bg-black px-5 font-sans text-sm font-bold text-white transition-opacity hover:opacity-85 dark:bg-white dark:text-black sm:flex"
            >
              <Pencil size={15} />
              Edit Profile
            </Link>
            </div>

            {/* Badges; on phones the Edit button joins this row instead of taking a column. */}
            <div className="mt-3 flex items-center justify-between gap-2 sm:mt-2 sm:pl-[104px]">
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-full border border-slate-200/50 bg-slate-100 px-2.5 py-0.5 font-sans text-[10px] font-bold text-slate-600 dark:border-slate-700/30 dark:bg-slate-800/60 dark:text-slate-300">
                  {providerLabel}
                </span>
                <span className="inline-flex items-center rounded-full border border-violet-100/50 bg-violet-50/80 px-2.5 py-0.5 font-sans text-[10px] font-bold text-violet-700 dark:border-violet-900/25 dark:bg-violet-950/20 dark:text-violet-400">
                  {accountAge} hari member
                </span>
              </div>
              <Link
                href="/settings"
                className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-black px-3.5 font-sans text-xs font-bold text-white transition-opacity hover:opacity-85 dark:bg-white dark:text-black sm:hidden"
              >
                <Pencil size={13} />
                Edit
              </Link>
            </div>
          </section>

          {/* Account at a glance */}
          <dl className="grid grid-cols-3 divide-x divide-slate-200/70 rounded-2xl border border-slate-200/70 bg-white/70 py-3 backdrop-blur-md dark:divide-slate-800/60 dark:border-slate-800/50 dark:bg-slate-900/60">
            {facts.map((fact) => (
              // Wrap rather than truncate: on 320px phones a date won't fit one line.
              <div key={fact.label} className="min-w-0 px-2 text-center sm:px-4">
                <dt className="font-sans text-[10px] font-bold uppercase leading-tight tracking-wider text-slate-400 dark:text-slate-500">
                  {fact.label}
                </dt>
                <dd className={`mt-1 font-sans text-[13px] font-semibold leading-tight sm:text-sm ${fact.tone ?? ''}`}>
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          {/* Shortcuts */}
          <section>
            <h3 className="mb-3 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
              {shortcuts.map((item) => (
                <Link key={item.href} href={item.href} className={tileClass}>
                  <Tile icon={item.icon} title={item.title} sub={item.sub} />
                </Link>
              ))}
              <button type="button" onClick={() => setIsSupportOpen(true)} className={tileClass}>
                <Tile icon={<LifeBuoy size={18} />} title="Support" sub="Bantuan & masukan" />
              </button>
            </div>
          </section>

          {/* Diagnostics */}
          <section className="rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-md dark:border-slate-800/40 dark:bg-slate-900/70">
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              aria-expanded={showDiagnostics}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 text-left sm:px-5"
            >
              <span className="flex items-center gap-2">
                <Info size={15} className="text-violet-500" />
                <span className="font-sans text-sm font-bold text-black/80 dark:text-white/80">
                  Diagnostics &amp; Session Info
                </span>
              </span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-slate-400 transition-transform ${showDiagnostics ? 'rotate-180' : ''}`}
              />
            </button>

            {showDiagnostics && (
              <div className="grid animate-fade-in gap-3 border-t border-slate-100 px-4 pb-4 pt-4 font-sans dark:border-slate-800/80 sm:grid-cols-2 sm:px-5">
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">User ID</p>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="-my-2 inline-flex min-h-[36px] items-center gap-1 px-1 text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400"
                    >
                      {copied ? (
                        <>
                          <Check size={11} className="text-emerald-500" />
                          <span className="text-emerald-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy ID</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="break-all rounded-xl border border-slate-200/50 bg-slate-50 p-2.5 font-mono text-xs text-slate-800 dark:border-slate-800/35 dark:bg-slate-950/40 dark:text-slate-200">
                    {user.id}
                  </p>
                </div>
                {[
                  { label: 'Account Created', value: formatDate(user.created_at, true) },
                  { label: 'Last Login Session', value: user.last_sign_in_at ? formatDate(user.last_sign_in_at, true) : 'First login' },
                  { label: 'Auth Mechanism', value: user.provider === 'google' ? 'Google OAuth' : 'Email OTP' },
                  { label: 'Primary Email', value: user.email },
                ].map((row) => (
                  <div key={row.label} className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{row.label}</p>
                    <p className="break-all rounded-xl border border-slate-200/50 bg-slate-50 p-2.5 text-sm font-semibold text-slate-800 dark:border-slate-800/35 dark:bg-slate-950/40 dark:text-slate-200">
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </>
  );
}
