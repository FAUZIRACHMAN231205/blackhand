'use client';

import { useEffect, useState } from 'react';

const NONE: ReadonlySet<string> = new Set();

/**
 * The works this visitor owns, in one request, so any grid can mark them
 * "Milik Anda" without asking per card. Empty while signed out.
 */
export function useOwnedWorkIds(signedIn: boolean): ReadonlySet<string> {
  const [owned, setOwned] = useState<ReadonlySet<string>>(NONE);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch('/api/me/albums')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { workIds: string[] } | null) => {
        if (!cancelled && data) setOwned(new Set(data.workIds));
      })
      .catch((err) => console.error('Error loading owned works:', err));
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  return signedIn ? owned : NONE;
}
