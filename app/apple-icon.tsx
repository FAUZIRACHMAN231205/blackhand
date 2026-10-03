import { renderBrandIcon } from './lib/brandIcon';

/** The home-screen icon iOS uses when the site is added to the Home Screen. */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return renderBrandIcon(size.width);
}
