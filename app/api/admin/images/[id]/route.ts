import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { removeStoredImages, removeOriginals } from '@/app/lib/storage';
import { setFeaturedImage } from '@/app/lib/workImages';

async function loadOwnedImage(imageId: string, userId: string) {
  const { data: image } = await supabaseAdmin
    .from('work_images')
    .select('id, work_id, image_url, original_path, is_featured')
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

/**
 * Keep works.featured_image_url pointing at an image that actually exists, and
 * make sure the album still has exactly one unlocked (clean) preview.
 */
async function resyncFeaturedImage(workId: string) {
  const { data: remaining } = await supabaseAdmin
    .from('work_images')
    .select('id, image_url, is_featured')
    .eq('work_id', workId)
    .order('display_order', { ascending: true });

  const images = remaining ?? [];

  if (images.length === 0) {
    await supabaseAdmin.from('works').update({ featured_image_url: null }).eq('id', workId);
    return;
  }

  const featured = images.find((img) => img.is_featured);
  if (!featured) {
    // The cover was the one deleted: promote the first survivor, which also
    // regenerates its preview as the album's single clean image.
    await setFeaturedImage(workId, images[0].id);
    return;
  }

  await supabaseAdmin
    .from('works')
    .update({ featured_image_url: featured.image_url })
    .eq('id', workId);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const owned = await loadOwnedImage(id, auth.user.id);
  if (!owned.ok) return NextResponse.json({ error: owned.message }, { status: owned.status });

  // Swaps the clean preview onto this image and re-blurs the previous cover.
  await setFeaturedImage(owned.image.work_id, id);

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

  // Row is gone; drop both the public preview and the private original.
  await removeStoredImages([owned.image.image_url]);
  await removeOriginals([owned.image.original_path]);
  await resyncFeaturedImage(owned.image.work_id);

  return NextResponse.json({ success: true });
}
