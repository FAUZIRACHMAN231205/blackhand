import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { requireUser } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { expireStaleOrders } from '@/app/lib/orders';
import {
  createSnapTransaction,
  isMidtransConfigured,
  PRODUCT_ORDER_PREFIX,
  type SnapItem,
} from '@/app/lib/midtrans';
import { parseShippingDetails, validateQuantity } from '@/app/lib/shop';
import { PAYMENT_WINDOW_MINUTES, RESERVATION_GRACE_MINUTES } from '@/app/lib/sales';

interface CreatedOrder {
  id: string;
  product_id: string;
  product_name: string;
  unit_price_idr: number;
  quantity: number;
  shipping_fee_idr: number;
  total_idr: number;
  created_at: string;
}

/**
 * Buy one product now: takes the units off stock for the payment window and
 * opens a Midtrans Snap checkout for product + flat shipping.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  if (!isMidtransConfigured()) {
    return NextResponse.json({ error: 'Pembayaran belum dikonfigurasi.' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const quantityError = validateQuantity(body.quantity);
  if (quantityError) return NextResponse.json({ error: quantityError }, { status: 400 });
  const quantity = body.quantity as number;

  const shipping = parseShippingDetails(body);
  if (!shipping.ok) return NextResponse.json({ error: shipping.error }, { status: 400 });

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, is_published')
    .eq('id', id)
    .maybeSingle();

  if (!product || !product.is_published) {
    return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
  }

  // Return any stock held by lapsed checkouts before deciding it has run out.
  await expireStaleOrders();

  const providerOrderId = `${PRODUCT_ORDER_PREFIX}${crypto.randomUUID()}`;
  const { data: created, error: createError } = await supabaseAdmin.rpc('create_product_order', {
    p_user_id: auth.user.id,
    p_product_id: id,
    p_quantity: quantity,
    p_provider_order_id: providerOrderId,
    p_recipient_name: shipping.value.recipient_name,
    p_recipient_phone: shipping.value.recipient_phone,
    p_shipping_address: shipping.value.shipping_address,
    p_shipping_city: shipping.value.shipping_city,
    p_shipping_postal_code: shipping.value.shipping_postal_code,
    p_notes: shipping.value.notes,
    p_pay_minutes: PAYMENT_WINDOW_MINUTES,
    p_grace_minutes: RESERVATION_GRACE_MINUTES,
  });

  if (createError) {
    console.error('Error creating product order:', createError);
    return NextResponse.json({ error: 'Gagal membuat pesanan.' }, { status: 500 });
  }

  const order = (created as CreatedOrder[] | null)?.[0];
  if (!order) {
    return NextResponse.json(
      { error: 'Stok tidak mencukupi. Kurangi jumlah atau coba lagi nanti.' },
      { status: 409 }
    );
  }

  const items: SnapItem[] = [
    { id: order.product_id, price: order.unit_price_idr, quantity: order.quantity, name: order.product_name },
  ];
  if (order.shipping_fee_idr > 0) {
    items.push({ id: 'SHIPPING', price: order.shipping_fee_idr, quantity: 1, name: 'Ongkos kirim' });
  }

  try {
    const snap = await createSnapTransaction({
      orderId: providerOrderId,
      items,
      customerEmail: auth.user.email,
      customerName: auth.user.full_name,
      shipping: {
        name: shipping.value.recipient_name,
        phone: shipping.value.recipient_phone,
        address: shipping.value.shipping_address,
        city: shipping.value.shipping_city,
        postalCode: shipping.value.shipping_postal_code,
      },
      startedAt: new Date(order.created_at),
      payMinutes: PAYMENT_WINDOW_MINUTES,
    });

    await supabaseAdmin.from('product_orders').update({ snap_token: snap.token }).eq('id', order.id);

    return NextResponse.json({ orderId: order.id, token: snap.token, totalIdr: order.total_idr });
  } catch (e) {
    // The transaction never opened: fail the order, which also returns its stock.
    await supabaseAdmin.rpc('apply_product_order_notification', {
      p_order_id: order.id,
      p_status: 'failed',
      p_transaction_id: null,
      p_payment_type: null,
      p_raw: null,
    });
    console.error('Midtrans error:', e);
    return NextResponse.json({ error: 'Gagal menghubungi penyedia pembayaran.' }, { status: 502 });
  }
}
