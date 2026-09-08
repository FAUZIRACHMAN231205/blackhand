// Admin helper untuk check authorization
// Role-based: checks user.role from the database instead of a hardcoded email list.

import type { User } from '@/app/types';

/**
 * Check apakah user adalah admin
 * @param user - User object (or null/undefined)
 * @returns true jika user memiliki role 'admin'
 */
export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'admin';
}
