import { NextResponse } from 'next/server';
import { requireUser } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

/** Pending bank-transfer / e-wallet orders stay visible this long. */
const PENDING_WINDOW_MS = 24 * 60 * 60 * 1000;

interface OrderRow {
  id: string;
  work_id: string;
  work_title: string;
  amount_idr: number;
  status: 'paid' | 'pending';
  created_at: string;
  paid_at: string | null;
  works: {
    title: string;
    category: string;
    featured_image_url: string | null;
    work_images: { count: number }[];
  } | null;
}

/**
 * The signed-in buyer's albums: what they own, plus recent payments that are
 * still waiting on confirmation (virtual accounts can take hours to settle).
 */
export async function GET() {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(
      'id, work_id, work_title, amount_idr, status, created_at, paid_at, works(title, category, featured_image_url, work_images(count))'
    )
    .eq('user_id', auth.user.id)
    .in('status', ['paid', 'pending'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json({ error: 'Gagal memuat album.' }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as OrderRow[];
  const shape = (o: OrderRow) => ({
    orderId: o.id,
    workId: o.work_id,
    // The live title when the album still exists, the purchase-time snapshot otherwise.
    title: o.works?.title ?? o.work_title,
    category: o.works?.category ?? null,
    coverUrl: o.works?.featured_image_url ?? null,
    imageCount: o.works?.work_images?.[0]?.count ?? 0,
    amountIdr: o.amount_idr,
    purchasedAt: o.paid_at ?? o.created_at,
  });

  const owned = rows.filter((o) => o.status === 'paid');
  const ownedIds = new Set(owned.map((o) => o.work_id));

  // One pending row per album at most, newest first, hidden once the album is owned.
  const seen = new Set<string>();
  const cutoff = Date.now() - PENDING_WINDOW_MS;
  const pending = rows.filter((o) => {
    if (o.status !== 'pending' || ownedIds.has(o.work_id) || seen.has(o.work_id)) return false;
    if (new Date(o.created_at).getTime() < cutoff) return false;
    seen.add(o.work_id);
    return true;
  });

  return NextResponse.json({ owned: owned.map(shape), pending: pending.map(shape) });
}
