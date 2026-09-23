/** Rows per page for each list. */
export const GALLERY_PAGE_SIZE = 12;
export const FEED_PAGE_SIZE = 6;
export const ADMIN_WORKS_PAGE_SIZE = 20;

/**
 * Range for one page, asking for a single extra row: if it comes back there is
 * another page, which saves a separate exact count on every load.
 *
 * Offset-based on purpose — simple, and these lists are ordered newest-first,
 * where new rows appear on the first page rather than shifting later ones.
 */
export function pageRange(page: number, size: number): [from: number, to: number] {
  const from = page * size;
  return [from, from + size];
}

/** Split the extra row back off: what to show, and whether more remain. */
export function splitPage<T>(rows: T[], size: number): { items: T[]; hasMore: boolean } {
  return { items: rows.slice(0, size), hasMore: rows.length > size };
}
