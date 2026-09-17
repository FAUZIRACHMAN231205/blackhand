import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { hasPurchased } from '@/app/lib/orders';
import { signOriginalUrl } from '@/app/lib/storage';

/**
 * Ownership status for one album, plus the full-resolution images when owned.
 *
 * Anonymous visitors and non-buyers simply get `owned: false` — the originals
 * live in a private bucket and are only ever handed out as short-lived signed
 * URLs from here.
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

  const images = await Promise.all(
    (rows ?? []).map(async (row) => ({
      id: row.id as string,
      url: row.original_path ? await signOriginalUrl(row.original_path as string, 600) : null,
    }))
  );

  return NextResponse.json({
    owned: true,
    images: images.filter((i): i is { id: string; url: string } => i.url !== null),
  });
}
