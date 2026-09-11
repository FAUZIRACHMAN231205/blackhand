import 'server-only';
import sharp from 'sharp';

/** Long-edge caps for the two kinds of public preview. */
export const PREVIEW_MAX_EDGE = 1200;
export const BLURRED_MAX_EDGE = 420;

/**
 * Clean, downscaled preview — what every visitor sees for an album's featured
 * image. Good enough to enjoy on screen, not the deliverable.
 */
export async function makeCleanPreview(input: Buffer): Promise<Buffer> {
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

/**
 * Locked preview for the images behind the paywall. The blur is baked into the
 * file itself — never a CSS effect — so the sharp version is never delivered to
 * a browser before purchase. Downscaling first keeps it tiny; the blur has
 * destroyed the detail anyway.
 */
export async function makeBlurredPreview(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({
      width: BLURRED_MAX_EDGE,
      height: BLURRED_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .blur(18)
    .jpeg({ quality: 60, mozjpeg: true })
    .toBuffer();
}

/** Build the public preview for an image, based on whether it is unlocked. */
export function makePreview(input: Buffer, unlocked: boolean): Promise<Buffer> {
  return unlocked ? makeCleanPreview(input) : makeBlurredPreview(input);
}
