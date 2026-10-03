'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WorkSaleState } from '../lib/sales';

/**
 * Where a work stands for the current visitor — available, being bought by
 * someone else, sold, or owned — and, when owned, the stable full-resolution
 * URLs to show instead of the previews.
 *
 * Ownership is always decided by the server; this hook never infers it from
 * anything the browser knows. `isLoggedIn` is only a dependency: signing in or
 * out changes the answer, so the hook asks again.
 */
export function useAlbumAccess(workId: string | null, isLoggedIn: boolean) {
  const [owned, setOwned] = useState(false);
  const [sale, setSale] = useState<WorkSaleState | null>(null);
  const [unlockedUrls, setUnlockedUrls] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    if (!workId) {
      setOwned(false);
      setSale(null);
      setUnlockedUrls({});
      return;
    }

    setChecking(true);
    try {
      const res = await fetch(`/api/works/${workId}/album`);
      if (!res.ok) return;

      const data: {
        owned: boolean;
        sale: WorkSaleState;
        images: { id: string; url: string }[] | null;
      } = await res.json();

      setOwned(data.owned);
      setSale(data.sale);
      setUnlockedUrls(Object.fromEntries((data.images ?? []).map((img) => [img.id, img.url])));
    } catch (err) {
      console.error('Error checking album access:', err);
    } finally {
      setChecking(false);
    }
    // isLoggedIn is deliberately a dependency: the answer depends on the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workId, isLoggedIn]);

  useEffect(() => {
    // Fetching entitlement is exactly the external-system sync effects are for;
    // the state write happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { owned, sale, unlockedUrls, checking, refresh };
}
