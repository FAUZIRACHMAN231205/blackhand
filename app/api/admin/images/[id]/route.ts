import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

async function loadOwnedImage(imageId: string, userId: string) {
  const { data: image } = await supabaseAdmin
    .from('work_images')
    .select('id, work_id, image_url')
    .eq('id', imageId)
    .maybeSingle();

  if (!image) return { ok: false as const, status: 404, message: 'Image not found' };

  const { data: work } = await supabaseAdmin
    .from('works')
    .select('id, created_by')
    .eq('id', image.work_id)
    .maybeSingle();

  if (!work || work.created_by !== userId) {
    return { ok: false as const, status: 403, message: 'Forbidden' };
  }

  return { ok: true as const, image };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const owned = await loadOwnedImage(id, auth.user.id);
  if (!owned.ok) return NextResponse.json({ error: owned.message }, { status: owned.status });

  // Set this image as the featured one; clear the flag on all siblings.
  await supabaseAdmin.from('work_images').update({ is_featured: false }).eq('work_id', owned.image.work_id);
  const { error } = await supabaseAdmin.from('work_images').update({ is_featured: true }).eq('id', id);

  if (error) {
    console.error('Error setting featured image:', error);
    return NextResponse.json({ error: 'Failed to update featured image' }, { status: 500 });
  }

  await supabaseAdmin
    .from('works')
    .update({ featured_image_url: owned.image.image_url })
    .eq('id', owned.image.work_id);

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const owned = await loadOwnedImage(id, auth.user.id);
  if (!owned.ok) return NextResponse.json({ error: owned.message }, { status: owned.status });

  const { error } = await supabaseAdmin.from('work_images').delete().eq('id', id);

  if (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
