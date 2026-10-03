import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { expireStaleOrders } from '@/app/lib/orders';
import { ADMIN_ORDERS_PAGE_SIZE } from '@/app/lib/pagination';

const SALE_VIEWS = {
  sold: ['paid'],
  refund: ['needs_refund'],
  pending: ['pending'],
  history: ['refunded', 'failed', 'expired', 'cancelled'],
} as const;

type SaleView = keyof typeof SALE_VIEWS;

/**
 * Sales of this admin's works: who bought what, checkouts in progress, and
 * payments that arrived for an already-sold work and must be refunded.
 * `?view=sold|refund|pending|history&page=`
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const params = request.nextUrl.searchParams;
  const viewParam = params.get('view') ?? 'sold';
  const view: SaleView = viewParam in SALE_VIEWS ? (viewParam as SaleView) : 'sold';
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0);
  const from = page * ADMIN_ORDERS_PAGE_SIZE;

  await expireStaleOrders();

  const { data, error, count } = await supabaseAdmin
    .from('orders')
    .select(
      'id, work_id, work_title, amount_idr, status, provider_order_id, payment_type, created_at, paid_at, expires_at, users(email, full_name), works!inner(created_by, featured_image_url)',
      { count: 'exact' }
    )
    .eq('works.created_by', auth.user.id)
    .in('status', [...SALE_VIEWS[view]])
    .order('created_at', { ascending: false })
    .range(from, from + ADMIN_ORDERS_PAGE_SIZE - 1);

  if (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }

  const sales = data ?? [];
  return NextResponse.json({
    sales,
    total: count ?? sales.length,
    hasMore: from + sales.length < (count ?? 0),
  });
}
