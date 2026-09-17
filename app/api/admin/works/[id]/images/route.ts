import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { MAX_IMAGES_PER_WORK } from '@/app/lib/categories';
import { renderPreview, setFeaturedImage } from '@/app/lib/workImages';

/**
 * Registers an original that was just uploaded to the private bucket, and
 * derives the public preview from it. Images start locked (blurred); making one
 * featured is what unlocks a single clean preview for the album.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const { data: work } = await supabaseAdmin
    .from('works')
    .select('id, created_by')
    .eq('id', id)
    .maybeSingle();

  if (!work) return NextResponse.json({ error: 'Work not found' }, { status: 404 });
  if (work.created_by !== auth.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { original_path, display_order, is_featured } = await request.json();

    // Pin the path to this work so one album can never claim another's file.
    if (
      !original_path ||
      typeof original_path !== 'string' ||
      !original_path.startsWith(`works/${id}/`)
    ) {
      return NextResponse.json({ error: 'A valid original_path is required' }, { status: 400 });
    }

    const { count } = await supabaseAdmin
      .from('work_images')
      .select('id', { count: 'exact', head: true })
      .eq('work_id', id);

    if ((count ?? 0) >= MAX_IMAGES_PER_WORK) {
      return NextResponse.json(
        { error: `A work can have at most ${MAX_IMAGES_PER_WORK} images` },
        { status: 400 }
      );
    }

    const previewUrl = await renderPreview(id, original_path, false);
    if (!previewUrl) {
      return NextResponse.json({ error: 'Failed to process the uploaded image' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('work_images')
      .insert({
        work_id: id,
        image_url: previewUrl,
        original_path,
        display_order: display_order ?? 1,
        is_featured: false,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error inserting work_image:', error);
      return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
    }

    // Promoting handles clearing siblings, re-blurring the old cover and
    // syncing works.featured_image_url.
    if (is_featured) await setFeaturedImage(id, data.id);

    const { data: fresh } = await supabaseAdmin
      .from('work_images')
      .select('*')
      .eq('id', data.id)
      .maybeSingle();

    return NextResponse.json({ image: fresh ?? data });
  } catch (error: unknown) {
    console.error('Persist image error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
