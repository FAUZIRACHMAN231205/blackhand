import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';
import { paymentDeadline, publicSaleStatus, type WorkSaleState } from './sales';
import type { ShippingDetails } from './shop';

/** True when this buyer owns the work (their order for it is paid). */
export async function hasPurchased(userId: string, workId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .eq('work_id', workId)
    .eq('status', 'paid')
    .maybeSingle();

  return Boolean(data);
}

/** Album ids this buyer owns, for list views. */
export async function purchasedWorkIds(userId: string, workIds: string[]): Promise<Set<string>> {
  if (workIds.length === 0) return new Set();

  const { data } = await supabaseAdmin
    .from('orders')
    .select('work_id')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .in('work_id', workIds);

  return new Set((data ?? []).map((o) => o.work_id as string));
}

/**
 * Close checkouts whose payment window has passed, returning their stock and
 * freeing their works. Best effort: a failure here must never block a read.
 */
export async function expireStaleOrders(): Promise<void> {
  const { error } = await supabaseAdmin.rpc('expire_stale_orders');
  if (error) console.error('Failed to expire stale orders:', error);
}

/** A buyer re-opening Snap needs at least this long left to actually pay. */
const MIN_TIME_TO_PAY_MS = 60_000;

export interface ResumableCheckout {
  orderId: string;
  token: string;
  expiresAt: string;
}

/**
 * This buyer's still-payable checkout for a work, if any — so pressing "Buy"
 * again reopens the same payment instead of starting a second one.
 */
export async function findResumableWorkCheckout(
  userId: string,
  workId: string
): Promise<ResumableCheckout | null> {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id, snap_token, created_at, expires_at')
    .eq('user_id', userId)
    .eq('work_id', workId)
    .eq('status', 'pending')
    .not('snap_token', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.snap_token || !data.expires_at) return null;
  if (paymentDeadline(data.created_at).getTime() - Date.now() < MIN_TIME_TO_PAY_MS) return null;

  return { orderId: data.id, token: data.snap_token, expiresAt: data.expires_at };
}

export interface ResumableProductCheckout extends ResumableCheckout {
  totalIdr: number;
}

/**
 * This buyer's still-payable checkout for the same product, quantity and
 * address, if any — so pressing "Buy" again reopens that payment instead of
 * taking stock a second time. A changed quantity or address is a different
 * order: the old Snap token is locked to the old amount and shipping details.
 */
export async function findResumableProductCheckout(
  userId: string,
  productId: string,
  quantity: number,
  shipping: ShippingDetails
): Promise<ResumableProductCheckout | null> {
  const { data } = await supabaseAdmin
    .from('product_orders')
    .select('id, snap_token, total_idr, created_at, expires_at')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('status', 'pending')
    .eq('stock_reserved', true)
    .eq('quantity', quantity)
    .eq('recipient_name', shipping.recipient_name)
    .eq('recipient_phone', shipping.recipient_phone)
    .eq('shipping_address', shipping.shipping_address)
    .eq('shipping_city', shipping.shipping_city)
    .eq('shipping_postal_code', shipping.shipping_postal_code)
    .eq('notes', shipping.notes)
    .not('snap_token', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.snap_token || !data.expires_at) return null;
  if (paymentDeadline(data.created_at).getTime() - Date.now() < MIN_TIME_TO_PAY_MS) return null;

  return { orderId: data.id, token: data.snap_token, expiresAt: data.expires_at, totalIdr: data.total_idr };
}

interface WorkSaleRow {
  id: string;
  is_for_sale: boolean | null;
  price_idr: number | null;
  sold_at: string | null;
  reserved_until: string | null;
}

/** Where a work stands for one visitor (or for anyone, when `userId` is null). */
export async function workSaleStateFor(work: WorkSaleRow, userId: string | null): Promise<WorkSaleState> {
  const base = publicSaleStatus(work);
  const reservedUntil = base === 'reserved' ? work.reserved_until : null;

  if (!userId) return { status: base, reservedUntil };

  if (base === 'sold') {
    return { status: (await hasPurchased(userId, work.id)) ? 'owned' : 'sold', reservedUntil: null };
  }

  if (base === 'reserved') {
    // Is the reservation this visitor's own unfinished checkout?
    const { data } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('work_id', work.id)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('expires_at', work.reserved_until as string)
      .limit(1)
      .maybeSingle();
    if (data) return { status: 'reserved_by_you', reservedUntil };
  }

  return { status: base, reservedUntil };
}
