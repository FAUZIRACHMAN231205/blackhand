import 'server-only';
import { NextResponse } from 'next/server';
import { getSession } from './session';
import { isAdmin } from './adminUtils';
import { getUserById } from './users';
import type { User } from '@/app/types';

type Guard = { user: User } | { error: NextResponse };

export async function requireUser(): Promise<Guard> {
  const user = await getSession();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user };
}

export async function requireAdmin(): Promise<Guard> {
  const result = await requireUser();
  if ('error' in result) return result;

  // Authoritative role check: read the live role from the database rather than
  // trusting the session JWT (valid up to 30 days). A demoted or deleted admin
  // therefore loses access immediately instead of when their token expires.
  const fresh = await getUserById(result.user.id);
  if (!fresh) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!isAdmin(fresh)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user: fresh };
}
