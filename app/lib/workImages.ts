import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';
import {
  downloadOriginal,
  uploadPreview,
  removeStoredImages,
  previewKey,
} from './storage';
import { makePreview } from './images';

/** `works/<workId>/<fileId>.jpg` -> `<fileId>` */
export function fileIdFromOriginalPath(originalPath: string): string {
  const base = originalPath.split('/').pop() ?? originalPath;
  return base.replace(/\.[^.]+$/, '');
}

/** Generate + upload a preview for an original, returning its public URL. */
export async function renderPreview(
  workId: string,
  originalPath: string,
  unlocked: boolean
): Promise<string | null> {
  const original = await downloadOriginal(originalPath);
  if (!original) return null;

  const fileId = fileIdFromOriginalPath(originalPath);
  return uploadPreview(previewKey(workId, fileId, unlocked), await makePreview(original, unlocked));
}

/**
 * Build (or rebuild) the public preview for one image so it matches its
 * locked/unlocked state, point the row at it, and drop the preview from the
 * previous state. Returns the new public URL, or null if it could not be built.
 */
export async function buildPreview(
  workId: string,
  image: { id: string; image_url: string | null; original_path: string | null },
  unlocked: boolean
): Promise<string | null> {
  if (!image.original_path) return null;

  const original = await downloadOriginal(image.original_path);
  if (!original) return null;

  const fileId = fileIdFromOriginalPath(image.original_path);
  const url = await uploadPreview(previewKey(workId, fileId, unlocked), await makePreview(original, unlocked));
  if (!url) return null;

  await supabaseAdmin.from('work_images').update({ image_url: url }).eq('id', image.id);

  // Remove the preview for the state we just left, so a locked image never
  // keeps a clean file lying around in the public bucket.
  if (image.image_url && image.image_url !== url) {
    await removeStoredImages([image.image_url]);
  }
  return url;
}

/**
 * Make one image the album's featured (unlocked) image. Clears the flag on its
 * siblings, regenerates the previews of both the old and the new featured image
 * so exactly one clean preview exists, and syncs works.featured_image_url.
 */
export async function setFeaturedImage(workId: string, imageId: string): Promise<void> {
  const { data: images } = await supabaseAdmin
    .from('work_images')
    .select('id, image_url, original_path, is_featured')
    .eq('work_id', workId);

  const all = images ?? [];
  const next = all.find((img) => img.id === imageId);
  if (!next) return;

  const previous = all.find((img) => img.is_featured && img.id !== imageId);

  await supabaseAdmin.from('work_images').update({ is_featured: false }).eq('work_id', workId);
  await supabaseAdmin.from('work_images').update({ is_featured: true }).eq('id', imageId);

  // The one leaving the spotlight must go back behind the blur.
  if (previous) await buildPreview(workId, previous, false);

  const url = await buildPreview(workId, next, true);
  await supabaseAdmin
    .from('works')
    .update({ featured_image_url: url ?? next.image_url })
    .eq('id', workId);
}
