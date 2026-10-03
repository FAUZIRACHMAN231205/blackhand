import { renderBrandIcon } from './lib/brandIcon';

/**
 * Browser-tab favicon plus the sizes the web app manifest asks for. Each id is
 * served at /icon/<id>; generated once at build time.
 */
export function generateImageMetadata() {
  return [
    { id: '32', size: { width: 32, height: 32 }, contentType: 'image/png' },
    { id: '192', size: { width: 192, height: 192 }, contentType: 'image/png' },
    { id: '512', size: { width: 512, height: 512 }, contentType: 'image/png' },
  ];
}

export default async function Icon({ id }: { id: Promise<string> }) {
  return renderBrandIcon(Number(await id));
}
