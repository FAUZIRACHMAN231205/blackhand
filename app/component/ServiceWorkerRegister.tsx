'use client';

import { useEffect } from 'react';

/**
 * Registers /sw.js in production. In development it does the opposite —
 * removes any worker left from a production run on localhost — because dev
 * build files aren't content-hashed and a cached copy would fight hot reload.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      return;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch((err) => console.error('Service worker registration failed:', err));
  }, []);

  return null;
}
