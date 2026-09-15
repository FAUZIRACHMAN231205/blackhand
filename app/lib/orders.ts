import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';

/** True when this buyer already owns the album. */
export async function hasPurchased(userId: string, workId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .eq('work_id', workId)
    .eq('status', 'paid')
    .maybeSingle();

  return Boolean(data);
}

/** Album ids this buyer owns, for list views. */
export async function purchasedWorkIds(userId: string, workIds: string[]): Promise<Set<string>> {
  if (workIds.length === 0) return new Set();

  const { data } = await supabaseAdmin
    .from('orders')
    .select('work_id')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .in('work_id', workIds);

  return new Set((data ?? []).map((o) => o.work_id as string));
}
