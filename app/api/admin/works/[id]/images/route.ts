import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

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
    const { image_url, display_order, is_featured } = await request.json();

    if (!image_url || typeof image_url !== 'string') {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('work_images')
      .insert({
        work_id: id,
        image_url,
        display_order: display_order ?? 1,
        is_featured: Boolean(is_featured),
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error inserting work_image:', error);
      return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
    }

    if (is_featured) {
      await supabaseAdmin.from('works').update({ featured_image_url: image_url }).eq('id', id);
    }

    return NextResponse.json({ image: data });
  } catch (error: unknown) {
    console.error('Persist image error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg || 'Internal server error' }, { status: 500 });
  }
}
