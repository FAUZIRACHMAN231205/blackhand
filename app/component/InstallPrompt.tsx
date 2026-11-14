'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Share, SquarePlus, X } from 'lucide-react';
import { INSTALL_DISMISS_KEY, installMethod, isDismissed } from '../lib/pwa';
import { Button, cx, focusRing } from './ui';

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
      className="animate-rise-in fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[150] mx-auto max-w-md border border-ink bg-paper p-4 text-ink"
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- the app icon route, already sized */}
        <img src="/icon/192" alt="" width={44} height={44} className="h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em]">Pasang Blackhand</p>
          {method === 'prompt' ? (
            <p className="mt-1 font-sans text-sm leading-snug text-mute">
              Buka karya dan toko langsung dari layar utama, layar penuh seperti aplikasi.
            </p>
          ) : (
            <p className="mt-1 font-sans text-sm leading-relaxed text-mute">
              Ketuk <Share size={13} className="-mt-0.5 inline" aria-label="Bagikan" /> <strong className="text-ink">Bagikan</strong>,
              lalu pilih <SquarePlus size={13} className="-mt-0.5 inline" aria-hidden />{' '}
              <strong className="text-ink">Tambahkan ke Layar Utama</strong>.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup"
          className={cx('-m-2 flex h-11 w-11 shrink-0 items-center justify-center text-mute hover:text-ink', focusRing)}
        >
          <X size={18} aria-hidden />
        </button>
      </div>
      {method === 'prompt' && deferred && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={dismiss}>
            Nanti
          </Button>
          <Button size="sm" onClick={install}>
            Pasang
          </Button>
        </div>
      )}
    </div>
  );
}
