'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Whether the current visitor owns an album, and — when they do — the stable
 * full-resolution URLs to show instead of the blurred previews.
 *
 * Ownership is always decided by the server; this hook never infers it from
 * anything the browser knows.
 */
export function useAlbumAccess(workId: string | null, isLoggedIn: boolean) {
  const [owned, setOwned] = useState(false);
  const [unlockedUrls, setUnlockedUrls] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    if (!workId || !isLoggedIn) {
      setOwned(false);
      setUnlockedUrls({});
      return;
    }

    setChecking(true);
    try {
      const res = await fetch(`/api/works/${workId}/album`);
      if (!res.ok) return;

      const data: { owned: boolean; images: { id: string; url: string }[] | null } =
        await res.json();

      setOwned(data.owned);
      setUnlockedUrls(
        Object.fromEntries((data.images ?? []).map((img) => [img.id, img.url]))
      );
    } catch (err) {
      console.error('Error checking album access:', err);
    } finally {
      setChecking(false);
    }
  }, [workId, isLoggedIn]);

  useEffect(() => {
    // Fetching entitlement is exactly the external-system sync effects are for;
    // the state write happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { owned, unlockedUrls, checking, refresh };
}
