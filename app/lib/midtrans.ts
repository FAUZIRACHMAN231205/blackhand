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

export interface SnapItem {
  id: string;
  /** Unit price in whole rupiah. */
  price: number;
  quantity: number;
  name: string;
}

export interface SnapShipping {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

/**
 * Midtrans wants "yyyy-MM-dd HH:mm:ss Z". Written in Western Indonesian Time
 * (+0700) so dashboard timestamps read naturally for the shop owner.
 */
export function formatMidtransTime(date: Date): string {
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())} ` +
    `${pad(wib.getUTCHours())}:${pad(wib.getUTCMinutes())}:${pad(wib.getUTCSeconds())} +0700`
  );
}

/** Build the Snap request body. Split out so it can be checked without a network call. */
export function buildSnapPayload(params: {
  orderId: string;
  items: SnapItem[];
  customerEmail: string;
  customerName?: string | null;
  shipping?: SnapShipping;
  /** When the order was opened; the payment deadline counts from here. */
  startedAt: Date;
  payMinutes: number;
}) {
  const grossAmount = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const firstName = params.customerName || params.customerEmail.split('@')[0];

  return {
    transaction_details: { order_id: params.orderId, gross_amount: grossAmount },
    item_details: params.items.map((item) => ({ ...item, name: trimName(item.name) })),
    customer_details: {
      email: params.customerEmail,
      first_name: firstName,
      ...(params.shipping && {
        phone: params.shipping.phone,
        shipping_address: {
          first_name: params.shipping.name,
          phone: params.shipping.phone,
          address: params.shipping.address,
          city: params.shipping.city,
          postal_code: params.shipping.postalCode,
          country_code: 'IDN',
        },
      }),
    },
    // An explicit start time: without it Midtrans starts the clock when the
    // buyer picks a payment method, which could outlast our reservation.
    expiry: {
      start_time: formatMidtransTime(params.startedAt),
      unit: 'minutes',
      duration: params.payMinutes,
    },
    page_expiry: { unit: 'minutes', duration: params.payMinutes },
    credit_card: { secure: true },
  };
}

/**
 * Ask Midtrans to open a Snap transaction. Returns the token the browser needs
 * to render the payment popup. Amounts are in whole rupiah.
 */
export async function createSnapTransaction(
  params: Parameters<typeof buildSnapPayload>[0]
): Promise<SnapTransaction> {
  const auth = Buffer.from(`${serverKey()}:`).toString('base64');

  const res = await fetch(SNAP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(buildSnapPayload(params)),
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

/** Provider order ids tell the webhook which table an order lives in. */
export const WORK_ORDER_PREFIX = 'BH-';
export const PRODUCT_ORDER_PREFIX = 'BHM-';

export function orderKind(providerOrderId: string | undefined): 'work' | 'product' | null {
  if (!providerOrderId) return null;
  if (providerOrderId.startsWith(PRODUCT_ORDER_PREFIX)) return 'product';
  if (providerOrderId.startsWith(WORK_ORDER_PREFIX)) return 'work';
  return null;
}

/** The statuses a Midtrans notification can move an order to. */
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
