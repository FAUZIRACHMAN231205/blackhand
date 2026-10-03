'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Share, SquarePlus, X } from 'lucide-react';
import { INSTALL_DISMISS_KEY, installMethod, isDismissed } from '../lib/pwa';

/** Chrome's install event, which TypeScript's DOM types don't include yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Give visitors a moment with the site before suggesting they install it. */
const SHOW_AFTER_MS = 6000;

function readDismissed(): boolean {
  try {
    return isDismissed(localStorage.getItem(INSTALL_DISMISS_KEY));
  } catch {
    return false; // Storage blocked (private mode etc.) — just show it.
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Suggests adding Blackhand to the home screen, on phones and tablets only.
 * Chrome/Android gets a one-tap "Pasang" button; iOS, which has no install API,
 * gets the Share → "Add to Home Screen" steps. Never shown once installed,
 * inside social-app browsers that can't install, or in the admin panel.
 */
export default function InstallPrompt() {
  const pathname = usePathname();
  const [method, setMethod] = useState<'prompt' | 'ios' | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || readDismissed()) return;
    if (!window.matchMedia('(pointer: coarse)').matches) return;

    let captured: BeforeInstallPromptEvent | null = null;
    const onBeforeInstall = (e: Event) => {
      // Keep Chrome's own mini-infobar from appearing; we show ours instead.
      e.preventDefault();
      captured = e as BeforeInstallPromptEvent;
      setDeferred(captured);
    };
    const onInstalled = () => setMethod(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const timer = window.setTimeout(() => {
      const how = installMethod(navigator.userAgent, navigator.maxTouchPoints, captured !== null);
      if (how !== 'none') setMethod(how);
    }, SHOW_AFTER_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setMethod(null);
    try {
      localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    } catch {
      // Not remembered across visits; fine.
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The event can only be used once either way.
    setDeferred(null);
    if (outcome === 'accepted') setMethod(null);
    else dismiss();
  };

  if (!method || pathname?.startsWith('/admin')) return null;

  return (
    <div
      role="dialog"
      aria-label="Pasang aplikasi Blackhand"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[150] mx-auto max-w-md animate-fade-in-up rounded-2xl border border-white/10 bg-zinc-950/95 p-4 text-white shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-start gap-3">
        <img src="/icon/192" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-bold">Pasang Blackhand</p>
          {method === 'prompt' ? (
            <p className="mt-0.5 font-sans text-xs leading-snug text-white/70">
              Buka galeri dan toko langsung dari layar utama, layar penuh seperti aplikasi.
            </p>
          ) : (
            <p className="mt-0.5 font-sans text-xs leading-relaxed text-white/70">
              Ketuk{' '}
              <Share size={13} className="inline -mt-0.5" aria-label="Bagikan" /> <strong>Bagikan</strong>, lalu
              pilih <SquarePlus size={13} className="inline -mt-0.5" aria-hidden />{' '}
              <strong>Tambahkan ke Layar Utama</strong>.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup"
          className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/60 transition-colors hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
      {method === 'prompt' && deferred && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="min-h-[44px] flex-1 rounded-xl border border-white/15 font-sans text-[11px] font-black uppercase tracking-[0.2em] text-white/80 transition-colors hover:bg-white/10"
          >
            Nanti
          </button>
          <button
            type="button"
            onClick={install}
            className="min-h-[44px] flex-1 rounded-xl bg-white font-sans text-[11px] font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-zinc-200"
          >
            Pasang
          </button>
        </div>
      )}
    </div>
  );
}
