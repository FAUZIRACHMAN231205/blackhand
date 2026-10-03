import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { workSaleStateFor } from '@/app/lib/orders';

/**
 * Where a work stands for this visitor — available, being bought by someone
 * else, sold, or owned — plus, for the owner, where to load its
 * full-resolution images.
 *
 * Owners get stable image addresses (see images/[imageId]) rather than signed
 * Storage URLs, so a page left open never ends up pointing at expired links.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSession();

  const { data: work } = await supabaseAdmin
    .from('works')
    .select('id, is_published, is_for_sale, price_idr, sold_at, reserved_until')
    .eq('id', id)
    .maybeSingle();

  if (!work) {
    return NextResponse.json({ error: 'Karya tidak ditemukan.' }, { status: 404 });
  }

  const sale = await workSaleStateFor(work, user?.id ?? null);
  const owned = sale.status === 'owned';

  // A work taken down after it sold stays reachable for its buyer only.
  if (!work.is_published && !owned) {
    return NextResponse.json({ error: 'Karya tidak ditemukan.' }, { status: 404 });
  }

  if (!owned) {
    return NextResponse.json({ owned: false, sale, images: null });
  }

  const { data: rows } = await supabaseAdmin
    .from('work_images')
    .select('id, original_path, display_order')
    .eq('work_id', id)
    .order('display_order', { ascending: true });

  return NextResponse.json({
    owned: true,
    sale,
    images: (rows ?? [])
      .filter((row) => row.original_path)
      .map((row) => ({ id: row.id as string, url: `/api/works/${id}/images/${row.id}` })),
  });
}
