'use client';

import Script from 'next/script';

/** Midtrans Snap injects this global once its script has loaded. */
export interface SnapCallbacks {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
}
declare global {
  interface Window {
    snap?: { pay: (token: string, callbacks?: SnapCallbacks) => void };
  }
}

const CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? '';

// Sandbox client keys are prefixed `SB-`, production ones are not — so the
// right Snap host follows from the key itself and needs no second env var.
const SNAP_SRC = CLIENT_KEY.startsWith('SB-')
  ? 'https://app.sandbox.midtrans.com/snap/snap.js'
  : 'https://app.midtrans.com/snap/snap.js';

/** Loads the Snap popup script on pages that take payments. */
export default function SnapScript() {
  if (!CLIENT_KEY) return null;
  return <Script src={SNAP_SRC} data-client-key={CLIENT_KEY} strategy="afterInteractive" />;
}

/** Open the Snap popup. Returns false when the script hasn't loaded yet. */
export function openSnap(token: string, callbacks: SnapCallbacks): boolean {
  if (!window.snap) return false;
  window.snap.pay(token, callbacks);
  return true;
}
