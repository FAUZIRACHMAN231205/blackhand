import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { expireStaleOrders } from '@/app/lib/orders';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  await expireStaleOrders();

  const count = (result: { count: number | null }) => result.count ?? 0;

  const [
    worksResult,
    soldResult,
    worksIdsResult,
    productsResult,
    toShipResult,
    merchRefundResult,
    workRefundResult,
    workRevenueResult,
    merchRevenueResult,
  ] = await Promise.all([
    supabaseAdmin.from('works').select('id', { count: 'exact', head: true }).eq('created_by', auth.user.id),
    supabaseAdmin
      .from('works')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', auth.user.id)
      .not('sold_at', 'is', null),
    supabaseAdmin.from('works').select('id').eq('created_by', auth.user.id),
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('product_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'paid')
      .in('fulfillment_status', ['unfulfilled', 'processing']),
    supabaseAdmin
      .from('product_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'needs_refund'),
    supabaseAdmin
      .from('orders')
      .select('id, works!inner(created_by)', { count: 'exact', head: true })
      .eq('works.created_by', auth.user.id)
      .eq('status', 'needs_refund'),
    supabaseAdmin
      .from('orders')
      .select('amount_idr, works!inner(created_by)')
      .eq('works.created_by', auth.user.id)
      .eq('status', 'paid'),
    supabaseAdmin
      .from('product_orders')
      .select('total_idr')
      .eq('status', 'paid')
      .neq('fulfillment_status', 'cancelled'),
  ]);

  const workIds = (worksIdsResult.data ?? []).map((w) => w.id);
  let totalImages = 0;
  if (workIds.length > 0) {
    const { count: images } = await supabaseAdmin
      .from('work_images')
      .select('id', { count: 'exact', head: true })
      .in('work_id', workIds);
    totalImages = images ?? 0;
  }

  const workRevenue = (workRevenueResult.data ?? []).reduce((sum, o) => sum + (o.amount_idr ?? 0), 0);
  const merchRevenue = (merchRevenueResult.data ?? []).reduce((sum, o) => sum + (o.total_idr ?? 0), 0);

  return NextResponse.json({
    totalWorks: count(worksResult),
    totalImages,
    soldWorks: count(soldResult),
    totalProducts: count(productsResult),
    ordersToShip: count(toShipResult),
    needsRefund: count(merchRefundResult) + count(workRefundResult),
    revenueIdr: workRevenue + merchRevenue,
  });
}
