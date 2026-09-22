import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { hasPurchased } from '@/app/lib/orders';
import { signOriginalUrl } from '@/app/lib/storage';

/** How long each redirect target stays valid. */
const SIGNED_TTL_SECONDS = 300;
/** Browsers may reuse the redirect for a while — always less than the target lives. */
const REDIRECT_CACHE_SECONDS = 240;

/**
 * A stable address for one full-resolution image, for the album's owner only.
 *
 * Pages point <img> here instead of at a signed Storage URL, so an album left
 * open for hours never breaks: each load re-checks ownership and redirects to
 * a freshly signed URL. Unlike a signed URL, this address is useless without
 * the owner's session, so it can't be passed around.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await params;
  // One answer for every refusal, so the route doesn't reveal what exists.
  const notFound = () => new NextResponse(null, { status: 404 });

  const user = await getSession();
  if (!user || !(await hasPurchased(user.id, id))) return notFound();

  const { data: row } = await supabaseAdmin
    .from('work_images')
    .select('original_path')
    .eq('id', imageId)
    .eq('work_id', id)
    .maybeSingle();
  if (!row?.original_path) return notFound();

  const signed = await signOriginalUrl(row.original_path as string, SIGNED_TTL_SECONDS);
  if (!signed) return new NextResponse(null, { status: 502 });

  const response = NextResponse.redirect(signed, 302);
  response.headers.set('Cache-Control', `private, max-age=${REDIRECT_CACHE_SECONDS}`);
  // A different account on the same browser must not reuse this redirect.
  response.headers.set('Vary', 'Cookie');
  return response;
}
