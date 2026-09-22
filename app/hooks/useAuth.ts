import { useCallback, useEffect, useState } from 'react';
import type { User } from '../types';

/** Who is signed in, according to the server. Null on no session or failure. */
async function fetchSessionUser(): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me');
    const { user } = await res.json();
    return user ?? null;
  } catch (error) {
    console.error('Error checking session:', error);
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ignore an answer that lands after unmount.
    let ignore = false;
    fetchSessionUser().then((sessionUser) => {
      if (ignore) return;
      setUser(sessionUser);
      setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, []);

  /** Re-read the session, e.g. after the profile changed. */
  const refresh = useCallback(async () => {
    setUser(await fetchSessionUser());
    setLoading(false);
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return { user, loading, logout, refresh };
}
