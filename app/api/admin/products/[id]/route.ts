import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { removeProductImages } from '@/app/lib/storage';
import { validateProductInput } from '@/app/lib/shop';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const { data: product } = await supabaseAdmin.from('products').select('*').eq('id', id).maybeSingle();
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const { data: images } = await supabaseAdmin
    .from('product_images')
    .select('id, image_url, display_order')
    .eq('product_id', id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  return NextResponse.json({ product, images: images ?? [] });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const invalid = validateProductInput(body, true);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (typeof body.description === 'string') updates.description = body.description.trim();
  if (body.price_idr !== undefined) updates.price_idr = body.price_idr;
  if (body.stock !== undefined) updates.stock = body.stock;
  if (body.is_published !== undefined) updates.is_published = body.is_published;

  const { data, error } = await supabaseAdmin
    .from('products')
    .update(updates)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  // Orders keep a snapshot of the product, so history survives a delete — but
  // not while someone is paying for it or waiting for it to ship.
  const [{ count: pending }, { count: open }] = await Promise.all([
    supabaseAdmin
      .from('product_orders')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)
      .eq('status', 'pending'),
    supabaseAdmin
      .from('product_orders')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)
      .eq('status', 'paid')
      .in('fulfillment_status', ['unfulfilled', 'processing', 'shipped']),
  ]);

  if ((pending ?? 0) + (open ?? 0) > 0) {
    return NextResponse.json(
      { error: 'This product has orders in progress. Finish them first, or unpublish it instead.' },
      { status: 409 }
    );
  }

  const { data: images } = await supabaseAdmin
    .from('product_images')
    .select('storage_path')
    .eq('product_id', id);

  const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
  if (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }

  await removeProductImages((images ?? []).map((img) => img.storage_path));
  return NextResponse.json({ success: true });
}
