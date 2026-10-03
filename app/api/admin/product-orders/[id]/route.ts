import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import {
  allowedFulfillmentActions,
  type FulfillmentAction,
  type FulfillmentStatus,
  type PaymentStatus,
} from '@/app/lib/shop';

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/**
 * Move a paid merchandise order along: process → ship (with courier and
 * tracking number) → complete, or cancel before it ships (units go back on
 * the shelf; the refund itself is made in the Midtrans dashboard).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const action = body.action as FulfillmentAction;

  const { data: order } = await supabaseAdmin
    .from('product_orders')
    .select('id, status, fulfillment_status')
    .eq('id', id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const current = order.fulfillment_status as FulfillmentStatus;
  if (!allowedFulfillmentActions(order.status as PaymentStatus, current).includes(action)) {
    return NextResponse.json({ error: 'That step is not possible for this order now.' }, { status: 409 });
  }

  if (action === 'cancel') {
    const { data: cancelled, error } = await supabaseAdmin.rpc('cancel_product_order_fulfillment', {
      p_order_id: id,
    });
    if (error) {
      console.error('Error cancelling product order:', error);
      return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
    }
    if (!cancelled) {
      return NextResponse.json({ error: 'This order can no longer be cancelled.' }, { status: 409 });
    }
    return NextResponse.json({ success: true, fulfillment_status: 'cancelled' });
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };

  if (action === 'process') {
    updates.fulfillment_status = 'processing';
  } else if (action === 'ship') {
    const courier = text(body.courier);
    const tracking = text(body.tracking_number);
    if (courier.length < 2 || courier.length > 50) {
      return NextResponse.json({ error: 'Courier is required' }, { status: 400 });
    }
    if (tracking.length < 3 || tracking.length > 60) {
      return NextResponse.json({ error: 'Tracking number is required' }, { status: 400 });
    }
    Object.assign(updates, {
      fulfillment_status: 'shipped',
      courier,
      tracking_number: tracking,
      shipped_at: now,
    });
  } else if (action === 'complete') {
    Object.assign(updates, { fulfillment_status: 'completed', completed_at: now });
  }

  // Conditional on the stage we read, so two admins can't both advance it.
  const { data: updated, error } = await supabaseAdmin
    .from('product_orders')
    .update(updates)
    .eq('id', id)
    .eq('fulfillment_status', current)
    .select('id, fulfillment_status')
    .maybeSingle();

  if (error) {
    console.error('Error updating product order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: 'The order changed meanwhile. Reload and try again.' }, { status: 409 });
  }

  return NextResponse.json({ success: true, fulfillment_status: updated.fulfillment_status });
}
