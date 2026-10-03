import 'server-only';
import sharp from 'sharp';

/** Long-edge cap for public previews. */
export const PREVIEW_MAX_EDGE = 1200;

/**
 * Clean, downscaled preview — what every visitor sees, for every image of a
 * work and for product photos. Sharp enough to enjoy on screen; the
 * full-resolution original stays private and is the buyer's download.
 */
export async function makePreview(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate() // honour EXIF orientation before dropping metadata
    .resize({
      width: PREVIEW_MAX_EDGE,
      height: PREVIEW_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
