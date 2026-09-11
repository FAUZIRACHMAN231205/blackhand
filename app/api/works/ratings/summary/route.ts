import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

// Batch aggregate for list/grid views. Returns rating average + count and the
// comment count per work in a fixed number of queries, so gallery/feed cards
// no longer each fire their own Supabase read (the old N+1). Only aggregates
// are returned — never individual user_ids.
// Public: the gallery and feed are browsable without an account, and this only
// exposes aggregates over works that are already publicly readable.
export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get('ids');
  // Drop anything that is not a UUID: this endpoint is public, and passing a
  // malformed id straight to Postgres would turn junk input into a 500.
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const ids = (idsParam ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID.test(s))
    .slice(0, 200);

  if (ids.length === 0) {
    return NextResponse.json({ stats: {} });
  }

  const [ratingsRes, commentsRes] = await Promise.all([
    supabaseAdmin.from('work_ratings').select('work_id, rating').in('work_id', ids),
    supabaseAdmin.from('work_comments').select('work_id').in('work_id', ids),
  ]);

  if (ratingsRes.error || commentsRes.error) {
    console.error('Error fetching rating summary:', ratingsRes.error || commentsRes.error);
    return NextResponse.json({ error: 'Failed to fetch rating summary' }, { status: 500 });
  }

  const agg: Record<string, { sum: number; count: number; comments: number }> = {};
  for (const id of ids) {
    agg[id] = { sum: 0, count: 0, comments: 0 };
  }
  for (const row of ratingsRes.data ?? []) {
    const a = agg[row.work_id];
    if (a) {
      a.sum += row.rating;
      a.count += 1;
    }
  }
  for (const row of commentsRes.data ?? []) {
    const a = agg[row.work_id];
    if (a) a.comments += 1;
  }

  const stats: Record<string, { average: number; count: number; comments: number }> = {};
  for (const id of ids) {
    const { sum, count, comments } = agg[id];
    stats[id] = {
      average: count > 0 ? Number((sum / count).toFixed(1)) : 0,
      count,
      comments,
    };
  }

  return NextResponse.json({ stats });
}
