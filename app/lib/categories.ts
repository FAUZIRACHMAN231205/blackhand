// Single source of truth for the rules that describe a work, shared by the
// admin forms, the gallery filter and the API validation. Keeping one list
// prevents a typo from creating a category that no filter can ever match.
export const WORK_CATEGORIES = ['Paintings', 'Digital Art', 'Sculptures'] as const;

export type WorkCategory = (typeof WORK_CATEGORIES)[number];

export function isValidCategory(value: unknown): value is WorkCategory {
  return typeof value === 'string' && (WORK_CATEGORIES as readonly string[]).includes(value);
}

/** A work is an album of at most this many images. Enforced server-side. */
export const MAX_IMAGES_PER_WORK = 6;

/** Upload limits for work images, enforced when issuing a signed upload URL. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] as const;
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'] as const;

/**
 * Practical floor for a sellable album: Indonesian payment providers reject
 * charges below roughly this amount.
 */
export const MIN_PRICE_IDR = 1000;

/**
 * Validate the pricing pair. Returns an error message, or null when valid.
 * A price may be absent while the album is not for sale.
 */
export function validatePricing(priceIdr: unknown, isForSale: unknown): string | null {
  const forSale = Boolean(isForSale);

  if (priceIdr === undefined || priceIdr === null || priceIdr === '') {
    return forSale ? 'A price is required before an album can be sold' : null;
  }
  if (typeof priceIdr !== 'number' || !Number.isInteger(priceIdr) || priceIdr < 0) {
    return 'Price must be a whole number of rupiah';
  }
  if (forSale && priceIdr < MIN_PRICE_IDR) {
    return `Price must be at least Rp ${MIN_PRICE_IDR.toLocaleString('id-ID')} to be sold`;
  }
  return null;
}

/** Rp 25.000 */
export function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}
