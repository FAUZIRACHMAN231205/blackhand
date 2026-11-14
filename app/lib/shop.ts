// Rules for the merchandise shop, shared by the admin forms, the checkout form
// and the API validation. Pure functions only: safe to import from the client.

import { MIN_PRICE_IDR } from './categories';

export const MAX_IMAGES_PER_PRODUCT = 6;
export const MAX_ORDER_QUANTITY = 10;
export const MAX_STOCK = 100_000;
export const MAX_SHIPPING_FEE_IDR = 10_000_000;

export const PRODUCT_NAME_MAX = 120;
export const PRODUCT_DESCRIPTION_MAX = 4000;

export interface ProductInput {
  name?: unknown;
  description?: unknown;
  price_idr?: unknown;
  compare_at_price_idr?: unknown;
  stock?: unknown;
  is_published?: unknown;
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

/**
 * Validate a product for create (`partial = false`) or update (`partial = true`,
 * where absent fields are left alone). Returns an error message, or null.
 * Shown to the admin as is, so in Indonesian like the rest of the site.
 */
export function validateProductInput(input: ProductInput, partial = false): string | null {
  const { name, description, price_idr, compare_at_price_idr, stock, is_published } = input;

  if (!partial || name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) return 'Nama produk wajib diisi';
    if (name.trim().length > PRODUCT_NAME_MAX) return `Nama produk maksimal ${PRODUCT_NAME_MAX} karakter`;
  }
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') return 'Deskripsi tidak valid';
    if (description.length > PRODUCT_DESCRIPTION_MAX) {
      return `Deskripsi maksimal ${PRODUCT_DESCRIPTION_MAX} karakter`;
    }
  }
  if (!partial || price_idr !== undefined) {
    if (!isWholeNumber(price_idr)) return 'Harga harus bilangan bulat rupiah';
    if (price_idr < MIN_PRICE_IDR) {
      return `Harga minimal Rp ${MIN_PRICE_IDR.toLocaleString('id-ID')}`;
    }
  }
  if (compare_at_price_idr !== undefined && compare_at_price_idr !== null) {
    if (!isWholeNumber(compare_at_price_idr) || compare_at_price_idr < 0) {
      return 'Harga coret harus bilangan bulat rupiah, 0 atau lebih';
    }
  }
  if (isWholeNumber(price_idr)) {
    const saleError = validateSalePrice(price_idr, compare_at_price_idr);
    if (saleError) return saleError;
  }
  if (!partial || stock !== undefined) {
    if (!isWholeNumber(stock) || stock < 0) return 'Stok harus bilangan bulat, 0 atau lebih';
    if (stock > MAX_STOCK) return `Stok maksimal ${MAX_STOCK.toLocaleString('id-ID')}`;
  }
  if (is_published !== undefined && typeof is_published !== 'boolean') {
    return 'Status tayang tidak valid';
  }
  return null;
}

/**
 * A compare-at price only makes sense above the selling price: anything else
 * would put a product in the shop's "Diskon" list without a visible discount.
 * Empty (null/undefined) means "not on sale" and is always fine.
 */
export function validateSalePrice(priceIdr: number, compareAtPriceIdr: unknown): string | null {
  if (compareAtPriceIdr === undefined || compareAtPriceIdr === null) return null;
  if (typeof compareAtPriceIdr === 'number' && compareAtPriceIdr <= priceIdr) {
    return 'Harga coret harus lebih tinggi dari harga jual, atau dikosongkan';
  }
  return null;
}

/** Percentage off, rounded, when compareAt is a real discount over price — else null. */
export function discountPercent(priceIdr: number, compareAtPriceIdr: number | null | undefined): number | null {
  if (!compareAtPriceIdr || compareAtPriceIdr <= priceIdr) return null;
  return Math.round(((compareAtPriceIdr - priceIdr) / compareAtPriceIdr) * 100);
}

/** A product counts as a fresh arrival for this many days after creation. */
export const NEW_ARRIVAL_DAYS = 14;

export function isNewArrival(createdAt: string): boolean {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs >= 0 && ageMs <= NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000;
}

export function validateShippingFee(fee: unknown): string | null {
  if (!isWholeNumber(fee) || fee < 0) return 'Ongkos kirim harus bilangan bulat rupiah, 0 atau lebih';
  if (fee > MAX_SHIPPING_FEE_IDR) return 'Ongkos kirim terlalu besar';
  return null;
}

export function validateQuantity(quantity: unknown): string | null {
  if (!isWholeNumber(quantity) || quantity < 1) return 'Jumlah minimal 1';
  if (quantity > MAX_ORDER_QUANTITY) return `Jumlah maksimal ${MAX_ORDER_QUANTITY} per pesanan`;
  return null;
}

/** Where to send a merchandise order. */
export interface ShippingDetails {
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  notes: string;
}

export const EMPTY_SHIPPING: ShippingDetails = {
  recipient_name: '',
  recipient_phone: '',
  shipping_address: '',
  shipping_city: '',
  shipping_postal_code: '',
  notes: '',
};

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/**
 * Clean and check shipping details from a request body. Phone numbers keep
 * only digits and a leading +, so couriers get something they can dial.
 */
export function parseShippingDetails(
  body: Record<string, unknown>
): { ok: true; value: ShippingDetails } | { ok: false; error: string; field: keyof ShippingDetails } {
  const value: ShippingDetails = {
    recipient_name: text(body.recipient_name),
    recipient_phone: text(body.recipient_phone).replace(/[^\d+]/g, ''),
    shipping_address: text(body.shipping_address),
    shipping_city: text(body.shipping_city),
    shipping_postal_code: text(body.shipping_postal_code),
    notes: text(body.notes),
  };

  if (value.recipient_name.length < 2 || value.recipient_name.length > 100) {
    return { ok: false, error: 'Nama penerima wajib diisi (2–100 karakter)', field: 'recipient_name' };
  }
  if (!/^\+?\d{8,15}$/.test(value.recipient_phone)) {
    return { ok: false, error: 'Nomor HP tidak valid (8–15 digit)', field: 'recipient_phone' };
  }
  if (value.shipping_address.length < 10 || value.shipping_address.length > 500) {
    return { ok: false, error: 'Alamat lengkap wajib diisi (10–500 karakter)', field: 'shipping_address' };
  }
  if (value.shipping_city.length < 2 || value.shipping_city.length > 100) {
    return { ok: false, error: 'Kota/kabupaten wajib diisi', field: 'shipping_city' };
  }
  if (!/^\d{5}$/.test(value.shipping_postal_code)) {
    return { ok: false, error: 'Kode pos harus 5 digit', field: 'shipping_postal_code' };
  }
  if (value.notes.length > 300) {
    return { ok: false, error: 'Catatan maksimal 300 karakter', field: 'notes' };
  }
  return { ok: true, value };
}

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'refunded'
  | 'needs_refund';

export type FulfillmentStatus = 'unfulfilled' | 'processing' | 'shipped' | 'completed' | 'cancelled';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Menunggu pembayaran',
  paid: 'Lunas',
  failed: 'Gagal',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
  refunded: 'Dikembalikan',
  needs_refund: 'Perlu dikembalikan',
};

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  unfulfilled: 'Perlu diproses',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

/** The admin actions a paid order allows from each fulfilment stage. */
export type FulfillmentAction = 'process' | 'ship' | 'complete' | 'cancel';

export function allowedFulfillmentActions(
  paymentStatus: PaymentStatus,
  fulfillment: FulfillmentStatus
): FulfillmentAction[] {
  if (paymentStatus !== 'paid') return [];
  switch (fulfillment) {
    case 'unfulfilled':
      return ['process', 'ship', 'cancel'];
    case 'processing':
      return ['ship', 'cancel'];
    case 'shipped':
      return ['complete'];
    default:
      return [];
  }
}

/** One line a buyer can read for where their order stands. */
export function orderStageLabel(paymentStatus: PaymentStatus, fulfillment: FulfillmentStatus): string {
  if (paymentStatus !== 'paid') return PAYMENT_STATUS_LABELS[paymentStatus];
  // "Perlu diproses" is the admin's to-do; the buyer just needs to know it's paid.
  if (fulfillment === 'unfulfilled') return 'Lunas · menunggu diproses';
  return FULFILLMENT_LABELS[fulfillment];
}
