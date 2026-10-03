import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { expireStaleOrders } from '@/app/lib/orders';
import { ADMIN_ORDERS_PAGE_SIZE } from '@/app/lib/pagination';

/** Each tab of the admin order list, as a PostgREST filter. */
const PRODUCT_ORDER_VIEWS = {
  // Money in, nothing sent yet — plus payments that need refunding.
  todo: 'and(status.eq.paid,fulfillment_status.in.(unfulfilled,processing)),status.eq.needs_refund',
  shipped: 'and(status.eq.paid,fulfillment_status.eq.shipped)',
  done: 'fulfillment_status.in.(completed,cancelled),status.eq.refunded',
  unpaid: 'status.in.(pending,failed,expired,cancelled)',
} as const;

type ProductOrderView = keyof typeof PRODUCT_ORDER_VIEWS;

function isView(value: string | null): value is ProductOrderView {
  return value !== null && value in PRODUCT_ORDER_VIEWS;
}

/** One page of merchandise orders for a tab. `?view=todo|shipped|done|unpaid&page=` */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const params = request.nextUrl.searchParams;
  const viewParam = params.get('view');
  const view: ProductOrderView = isView(viewParam) ? viewParam : 'todo';
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0);
  const from = page * ADMIN_ORDERS_PAGE_SIZE;

  await expireStaleOrders();

  const { data, error, count } = await supabaseAdmin
    .from('product_orders')
    .select(
      'id, product_id, product_name, unit_price_idr, quantity, subtotal_idr, shipping_fee_idr, total_idr, status, fulfillment_status, recipient_name, recipient_phone, shipping_address, shipping_city, shipping_postal_code, notes, courier, tracking_number, provider_order_id, payment_type, created_at, paid_at, shipped_at, completed_at, users(email, full_name)',
      { count: 'exact' }
    )
    .or(PRODUCT_ORDER_VIEWS[view])
    .order('created_at', { ascending: view === 'todo' })
    .range(from, from + ADMIN_ORDERS_PAGE_SIZE - 1);

  if (error) {
    console.error('Error fetching product orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  const orders = data ?? [];
  return NextResponse.json({
    orders,
    total: count ?? orders.length,
    hasMore: from + orders.length < (count ?? 0),
  });
}
