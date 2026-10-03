import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { removeProductImages } from '@/app/lib/storage';
import { syncProductCover } from '@/app/lib/products';

async function loadImage(id: string) {
  const { data } = await supabaseAdmin
    .from('product_images')
    .select('id, product_id, storage_path')
    .eq('id', id)
    .maybeSingle();
  return data;
}

/** Make this photo the product's cover by moving it to the front. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const image = await loadImage(id);
  if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

  const { data: first } = await supabaseAdmin
    .from('product_images')
    .select('display_order')
    .eq('product_id', image.product_id)
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  await supabaseAdmin
    .from('product_images')
    .update({ display_order: (first?.display_order ?? 1) - 1 })
    .eq('id', id);

  await syncProductCover(image.product_id);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const image = await loadImage(id);
  if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

  const { error } = await supabaseAdmin.from('product_images').delete().eq('id', id);
  if (error) {
    console.error('Error deleting product image:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }

  await removeProductImages([image.storage_path]);
  await syncProductCover(image.product_id);
  return NextResponse.json({ success: true });
}
