import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { expireStaleOrders } from '@/app/lib/orders';
import { validateProductInput } from '@/app/lib/shop';
import { ADMIN_WORKS_PAGE_SIZE } from '@/app/lib/pagination';

/** One page of every product (published or not), newest first. `?page=` is 0-based. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const page = Math.max(0, Number(request.nextUrl.searchParams.get('page') ?? 0) || 0);
  const from = page * ADMIN_WORKS_PAGE_SIZE;

  // Stock shown to the admin should not include lapsed checkouts.
  await expireStaleOrders();

  const { data, error, count } = await supabaseAdmin
    .from('products')
    .select('id, name, price_idr, stock, is_published, cover_image_url, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + ADMIN_WORKS_PAGE_SIZE - 1);

  if (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }

  const products = data ?? [];
  return NextResponse.json({
    products,
    total: count ?? products.length,
    hasMore: from + products.length < (count ?? 0),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const invalid = validateProductInput(body);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({
      name: String(body.name).trim(),
      description: typeof body.description === 'string' ? body.description.trim() : '',
      price_idr: body.price_idr,
      stock: body.stock,
      is_published: body.is_published ?? true,
      created_by: auth.user.id,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}
