import 'server-only';
import { NextResponse } from 'next/server';
import { getSession } from './session';
import { isAdmin } from './adminUtils';
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
  if (!isAdmin(result.user.email)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return result;
}
