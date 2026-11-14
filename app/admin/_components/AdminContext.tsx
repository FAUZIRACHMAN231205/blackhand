'use client';

import { createContext, useContext } from 'react';
import type { User } from '../../types';

export const AdminContext = createContext<{ user: User } | null>(null);

/** The signed-in admin, for pages inside /admin (the layout checked the role). */
export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin must be used inside the /admin layout');
  return value;
}
