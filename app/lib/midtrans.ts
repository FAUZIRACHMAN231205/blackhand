import 'server-only';
import crypto from 'node:crypto';

const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

const SNAP_URL = IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

function serverKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error('MIDTRANS_SERVER_KEY is missing. Add it to .env.local.');
  return key;
}

export function isMidtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY);
}

/** Midtrans caps item names at 50 characters. */
function trimName(name: string): string {
  return name.length > 50 ? `${name.slice(0, 47)}...` : name;
}

export interface SnapTransaction {
  token: string;
  redirectUrl: string;
}

/**
 * Ask Midtrans to open a Snap transaction. Returns the token the browser needs
 * to render the payment popup. Amount is in whole rupiah.
 */
export async function createSnapTransaction(params: {
  orderId: string;
  amountIdr: number;
  itemId: string;
  itemName: string;
  customerEmail: string;
  customerName?: string | null;
}): Promise<SnapTransaction> {
  const auth = Buffer.from(`${serverKey()}:`).toString('base64');

  const res = await fetch(SNAP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      transaction_details: { order_id: params.orderId, gross_amount: params.amountIdr },
      item_details: [
        {
          id: params.itemId,
          price: params.amountIdr,
          quantity: 1,
          name: trimName(params.itemName),
        },
      ],
      customer_details: {
        email: params.customerEmail,
        first_name: params.customerName || params.customerEmail.split('@')[0],
      },
      credit_card: { secure: true },
    }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.token) {
    const detail = body?.error_messages?.join(', ') || body?.status_message || `HTTP ${res.status}`;
    throw new Error(`Midtrans rejected the transaction: ${detail}`);
  }

  return { token: body.token, redirectUrl: body.redirect_url };
}

/**
 * Midtrans signs every notification with
 *   sha512(order_id + status_code + gross_amount + server_key)
 * Verifying it is what makes the webhook trustworthy — anyone can POST to it.
 */
export function verifyNotificationSignature(n: {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
}): boolean {
  if (!n.order_id || !n.status_code || !n.gross_amount || !n.signature_key) return false;

  // With no server key there is nothing to verify against, so nothing can be
  // trusted — fail closed rather than throwing out of the webhook route.
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) return false;

  const expected = crypto
    .createHash('sha512')
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${key}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(n.signature_key, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'refunded';

/** Translate Midtrans' transaction_status into the status we store. */
export function mapTransactionStatus(
  transactionStatus: string | undefined,
  fraudStatus?: string
): OrderStatus {
  switch (transactionStatus) {
    case 'capture':
      // A captured card payment is only money in the bank once fraud review passes.
      return fraudStatus === 'accept' ? 'paid' : 'pending';
    case 'settlement':
      return 'paid';
    case 'pending':
      return 'pending';
    case 'deny':
      return 'failed';
    case 'cancel':
      return 'cancelled';
    case 'expire':
      return 'expired';
    case 'refund':
    case 'partial_refund':
      return 'refunded';
    default:
      return 'pending';
  }
}
