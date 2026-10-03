import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { expireStaleOrders } from '@/app/lib/orders';
import { PUBLIC_PRODUCT_COLUMNS, getShippingFee } from '@/app/lib/products';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One published product with its photos and the current shipping fee. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
  }

  await expireStaleOrders();

  const { data: product } = await supabaseAdmin
    .from('products')
    .select(PUBLIC_PRODUCT_COLUMNS)
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
  }

  const [{ data: images }, shippingFeeIdr] = await Promise.all([
    supabaseAdmin
      .from('product_images')
      .select('id, image_url, display_order')
      .eq('product_id', id)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true }),
    getShippingFee(),
  ]);

  return NextResponse.json({ product, images: images ?? [], shippingFeeIdr });
}
