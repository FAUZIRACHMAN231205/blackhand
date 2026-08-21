import { NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';

export async function GET() {
  const user = await getSession();
  return NextResponse.json({ user });
}
