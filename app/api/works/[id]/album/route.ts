import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { hasPurchased } from '@/app/lib/orders';

/**
 * Ownership status for one album, plus where to load its full-resolution
 * images when owned.
 *
 * Anonymous visitors and non-buyers simply get `owned: false`. Owners get
 * stable image addresses (see images/[imageId]) rather than signed Storage
 * URLs, so a page left open never ends up pointing at expired links.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSession();

  if (!user || !(await hasPurchased(user.id, id))) {
    return NextResponse.json({ owned: false, images: null });
  }

  const { data: rows } = await supabaseAdmin
    .from('work_images')
    .select('id, original_path, display_order')
    .eq('work_id', id)
    .order('display_order', { ascending: true });

  return NextResponse.json({
    owned: true,
    images: (rows ?? [])
      .filter((row) => row.original_path)
      .map((row) => ({ id: row.id as string, url: `/api/works/${id}/images/${row.id}` })),
  });
}
