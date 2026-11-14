/**
 * The site map in one place (docs/DESIGN.md → Structure): the main menu, the
 * account tabs, and where every retired address now points.
 */

export interface NavItem {
  href: string;
  label: string;
}

/** Main menu, in order. Artworks first. */
export const MAIN_NAV: NavItem[] = [
  { href: '/gallery', label: 'Karya' },
  { href: '/shop', label: 'Toko' },
  { href: '/manifesto', label: 'Manifesto' },
];

export const ACCOUNT_HOME = '/account';
export const ACCOUNT_ORDERS = '/account/orders';
export const ACCOUNT_PROFILE = '/account/profile';

/** Tabs of the Akun page. Koleksi first: the works a member bought. */
export const ACCOUNT_TABS: NavItem[] = [
  { href: ACCOUNT_HOME, label: 'Koleksi' },
  { href: ACCOUNT_ORDERS, label: 'Pesanan' },
  { href: ACCOUNT_PROFILE, label: 'Profil' },
];

/**
 * Old addresses that were merged away. They redirect permanently, so links
 * already shared (and installed-app shortcuts) keep working. Query strings
 * pass through, e.g. /albums?drive=ok → /account?drive=ok.
 */
export const LEGACY_REDIRECTS: { source: string; destination: string }[] = [
  { source: '/works', destination: '/gallery' },
  { source: '/works/:id', destination: '/gallery/:id' },
  { source: '/dashboard', destination: ACCOUNT_HOME },
  { source: '/albums', destination: ACCOUNT_HOME },
  { source: '/orders', destination: ACCOUNT_ORDERS },
  { source: '/settings', destination: ACCOUNT_PROFILE },
];

/** Whether `href` is the current page or a page beneath it. */
export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
