import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { expireStaleOrders } from '@/app/lib/orders';
import { PUBLIC_PRODUCT_COLUMNS, getShippingFee } from '@/app/lib/products';
import { SHOP_PAGE_SIZE, pageRange, splitPage } from '@/app/lib/pagination';

/**
 * One page of published products, newest first. Served from here rather than
 * read straight from the browser so lapsed checkouts are swept first — stock
 * shown is stock you can actually buy.
 */
export async function GET(request: NextRequest) {
  const page = Math.max(0, Number(request.nextUrl.searchParams.get('page') ?? 0) || 0);
  const [from, to] = pageRange(page, SHOP_PAGE_SIZE);

  await expireStaleOrders();

  const [{ data, error }, shippingFeeIdr] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select(PUBLIC_PRODUCT_COLUMNS)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(from, to),
    getShippingFee(),
  ]);

  if (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Gagal memuat produk.' }, { status: 500 });
  }

  const { items, hasMore } = splitPage(data ?? [], SHOP_PAGE_SIZE);
  return NextResponse.json({ products: items, hasMore, shippingFeeIdr });
}
