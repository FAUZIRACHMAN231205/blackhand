'use client';

import { createContext, useContext } from 'react';
import type { User } from '../types';

interface AccountValue {
  /** The signed-in member. The Akun layout only renders its tabs once known. */
  user: User;
  /** Re-read the session, e.g. after the profile was saved. */
  refresh: () => Promise<void>;
}

export const AccountContext = createContext<AccountValue | null>(null);

/** The signed-in member, for pages inside /account. */
export function useAccount(): AccountValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error('useAccount must be used inside the /account layout');
  return value;
}
