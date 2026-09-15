import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import {
  verifyNotificationSignature,
  mapTransactionStatus,
  isMidtransConfigured,
} from '@/app/lib/midtrans';

/**
 * Midtrans payment notification — the authoritative source of payment status.
 * The browser redirect after checkout is only UX and is trivially forged, so
 * entitlement is granted here and nowhere else.
 *
 * Deliberately unauthenticated: Midtrans cannot log in. Trust comes from the
 * sha512 signature, which only someone holding our server key can produce.
 */
export async function POST(request: NextRequest) {
  // Distinguish "we aren't set up" from "this looks forged" — otherwise a
  // missing key would silently read as a stream of rejected notifications.
  if (!isMidtransConfigured()) {
    console.error('Midtrans notification arrived but MIDTRANS_SERVER_KEY is not set.');
    return NextResponse.json({ error: 'Payments not configured' }, { status: 503 });
  }

  let notification: Record<string, unknown>;
  try {
    notification = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const n = notification as {
    order_id?: string;
    status_code?: string;
    gross_amount?: string;
    signature_key?: string;
    transaction_status?: string;
    fraud_status?: string;
    transaction_id?: string;
    payment_type?: string;
  };

  if (!verifyNotificationSignature(n)) {
    console.warn('Rejected Midtrans notification with a bad signature:', n.order_id);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, status, amount_idr, paid_at')
    .eq('provider_order_id', n.order_id)
    .maybeSingle();

  if (!order) {
    console.warn('Midtrans notification for an unknown order:', n.order_id);
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // The amount must match what we charged; never grant access off a mismatch.
  const gross = Math.round(Number(n.gross_amount));
  if (!Number.isFinite(gross) || gross !== order.amount_idr) {
    console.error('Amount mismatch for order', n.order_id, gross, 'vs', order.amount_idr);
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
  }

  const status = mapTransactionStatus(n.transaction_status, n.fraud_status);

  // Notifications can arrive repeatedly and out of order: never take away a
  // paid album except through an explicit refund.
  if (order.status === 'paid' && status !== 'refunded') {
    return NextResponse.json({ received: true, unchanged: true });
  }

  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      status,
      provider_transaction_id: n.transaction_id ?? null,
      payment_type: n.payment_type ?? null,
      raw_notification: notification,
      paid_at: status === 'paid' ? order.paid_at ?? new Date().toISOString() : order.paid_at,
    })
    .eq('id', order.id);

  if (error) {
    console.error('Failed to apply Midtrans notification:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true, status });
}
