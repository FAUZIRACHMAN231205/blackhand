import { renderBrandIcon } from '../lib/brandIcon';

// Rendered once at build time, like the metadata icons.
export const dynamic = 'force-static';

/**
 * Android crops installed-app icons to its own shape (circle, squircle…), so
 * the manifest needs one icon whose mark stays inside the central safe zone.
 */
export function GET() {
  return renderBrandIcon(512, { safeZone: true });
}
