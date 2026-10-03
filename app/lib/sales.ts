// Rules for selling a work to a single buyer, shared by the API and the UI.
// Pure functions only: safe to import from client components.

/** How long a buyer has to finish paying once checkout opens. */
export const PAYMENT_WINDOW_MINUTES = 30;

/**
 * The work stays reserved this much longer than the payment window, so a
 * payment made in the last second still settles before anyone else can start.
 */
export const RESERVATION_GRACE_MINUTES = 5;

/**
 * Where a work stands for the person looking at it.
 *   not_for_sale     — the artist isn't selling it
 *   available        — anyone signed in can buy it
 *   reserved         — someone else is paying for it right now
 *   reserved_by_you  — this visitor has an unfinished checkout for it
 *   sold             — someone else bought it; view only
 *   owned            — this visitor bought it; downloads unlocked
 */
export type WorkSaleStatus =
  | 'not_for_sale'
  | 'available'
  | 'reserved'
  | 'reserved_by_you'
  | 'sold'
  | 'owned';

export interface WorkSaleState {
  status: WorkSaleStatus;
  /** When the current reservation lapses, if there is one. */
  reservedUntil: string | null;
}

interface SaleFields {
  is_for_sale?: boolean | null;
  price_idr?: number | null;
  sold_at?: string | null;
  reserved_until?: string | null;
}

export function isSold(work: SaleFields): boolean {
  return Boolean(work.sold_at);
}

export function isReserved(work: SaleFields, now: number = Date.now()): boolean {
  return Boolean(work.reserved_until) && new Date(work.reserved_until as string).getTime() > now;
}

/** The status anyone would see, before knowing who is looking. */
export function publicSaleStatus(
  work: SaleFields,
  now: number = Date.now()
): Exclude<WorkSaleStatus, 'owned' | 'reserved_by_you'> {
  if (isSold(work)) return 'sold';
  if (!work.is_for_sale || work.price_idr == null) return 'not_for_sale';
  if (isReserved(work, now)) return 'reserved';
  return 'available';
}

/** The last moment a checkout opened at `createdAt` can still be paid. */
export function paymentDeadline(createdAt: string | Date): Date {
  return new Date(new Date(createdAt).getTime() + PAYMENT_WINDOW_MINUTES * 60_000);
}

/** "14.35" in Indonesian time, for "reserved until …" messages. */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}
