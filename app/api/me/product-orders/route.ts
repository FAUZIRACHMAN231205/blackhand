import { NextResponse } from 'next/server';
import { requireUser } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { expireStaleOrders } from '@/app/lib/orders';
import { paymentDeadline } from '@/app/lib/sales';

/** How far back "Pesanan Saya" shows unpaid attempts; paid orders always show. */
const UNPAID_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** The signed-in shopper's merchandise orders, newest first. */
export async function GET() {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;

  await expireStaleOrders();

  const { data, error } = await supabaseAdmin
    .from('product_orders')
    .select(
      'id, product_id, product_name, unit_price_idr, quantity, subtotal_idr, shipping_fee_idr, total_idr, status, fulfillment_status, recipient_name, recipient_phone, shipping_address, shipping_city, shipping_postal_code, notes, courier, tracking_number, snap_token, created_at, paid_at, shipped_at, completed_at, products(cover_image_url)'
    )
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching product orders:', error);
    return NextResponse.json({ error: 'Gagal memuat pesanan.' }, { status: 500 });
  }

  const cutoff = Date.now() - UNPAID_WINDOW_MS;
  const orders = (data ?? [])
    .filter((o) => ['paid', 'needs_refund', 'refunded'].includes(o.status) || new Date(o.created_at).getTime() >= cutoff)
    .map(({ snap_token, products, ...o }) => {
      const cover = (products as unknown as { cover_image_url: string | null } | null)?.cover_image_url ?? null;
      const deadline = paymentDeadline(o.created_at);
      return {
        ...o,
        cover_image_url: cover,
        payment_deadline: deadline.toISOString(),
        // Only a still-open checkout can be resumed; the token itself stays server-side.
        can_resume: o.status === 'pending' && Boolean(snap_token) && deadline.getTime() > Date.now() + 60_000,
      };
    });

  return NextResponse.json({ orders });
}
