import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import {
  verifyNotificationSignature,
  mapTransactionStatus,
  isMidtransConfigured,
  orderKind,
} from '@/app/lib/midtrans';

/** Where each kind of order lives, what it cost, and which function applies a notification. */
const ORDER_TABLES = {
  work: { table: 'orders', amountColumn: 'amount_idr', apply: 'apply_work_order_notification' },
  product: {
    table: 'product_orders',
    amountColumn: 'total_idr',
    apply: 'apply_product_order_notification',
  },
} as const;

/**
 * Midtrans payment notification — the authoritative source of payment status.
 * The browser redirect after checkout is only UX and is trivially forged, so
 * entitlement is granted here and nowhere else.
 *
 * Deliberately unauthenticated: Midtrans cannot log in. Trust comes from the
 * sha512 signature, which only someone holding our server key can produce.
 *
 * The state change itself (a work becoming sold, stock being returned, …) runs
 * in one database function per order kind, so it is atomic and idempotent.
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

  const kind = orderKind(n.order_id);
  if (!kind) {
    console.warn('Midtrans notification for an unrecognised order id:', n.order_id);
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  const { table, amountColumn, apply } = ORDER_TABLES[kind];

  const { data: order } = await supabaseAdmin
    .from(table)
    .select(`id, ${amountColumn}`)
    .eq('provider_order_id', n.order_id as string)
    .maybeSingle();

  if (!order) {
    console.warn('Midtrans notification for an unknown order:', n.order_id);
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const row = order as unknown as Record<string, unknown> & { id: string };

  // The amount must match what we charged; never grant anything off a mismatch.
  const gross = Math.round(Number(n.gross_amount));
  if (!Number.isFinite(gross) || gross !== row[amountColumn]) {
    console.error('Amount mismatch for order', n.order_id, gross, 'vs', row[amountColumn]);
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
  }

  const status = mapTransactionStatus(n.transaction_status, n.fraud_status);

  const { data: outcome, error } = await supabaseAdmin.rpc(apply, {
    p_order_id: row.id,
    p_status: status,
    p_transaction_id: n.transaction_id ?? null,
    p_payment_type: n.payment_type ?? null,
    p_raw: notification,
  });

  if (error) {
    console.error('Failed to apply Midtrans notification:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  if (outcome === 'needs_refund') {
    // Paid, but the work was already sold (or the stock ran out). Nothing is
    // granted; the admin panel lists it for a manual refund.
    console.error('Payment could not be fulfilled and needs a refund:', n.order_id);
  }

  return NextResponse.json({ received: true, status, outcome });
}
