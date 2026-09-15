import { NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

/** Albums the signed-in visitor owns — one request for a whole list view. */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ workIds: [] });

  const { data } = await supabaseAdmin
    .from('orders')
    .select('work_id')
    .eq('user_id', user.id)
    .eq('status', 'paid');

  return NextResponse.json({ workIds: (data ?? []).map((o) => o.work_id as string) });
}
