import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';
import { downloadOriginal, uploadPreview, removeStoredImages, previewKey } from './storage';
import { makePreview } from './images';

/** `works/<workId>/<fileId>.jpg` -> `<fileId>` */
export function fileIdFromOriginalPath(originalPath: string): string {
  const base = originalPath.split('/').pop() ?? originalPath;
  return base.replace(/\.[^.]+$/, '');
}

/** Generate + upload the public preview for an original, returning its public URL. */
export async function renderPreview(workId: string, originalPath: string): Promise<string | null> {
  const original = await downloadOriginal(originalPath);
  if (!original) return null;

  const fileId = fileIdFromOriginalPath(originalPath);
  return uploadPreview(previewKey(workId, fileId), await makePreview(original));
}

/**
 * Previews built under the old paywall were stored blurred. Rebuild one clean
 * the first time it is touched, in case the one-off unblur script hasn't run.
 */
async function ensureCleanPreview(
  workId: string,
  image: { id: string; image_url: string | null; original_path: string | null }
): Promise<string | null> {
  if (!image.image_url?.includes('-locked.') || !image.original_path) return image.image_url;

  const url = await renderPreview(workId, image.original_path);
  if (!url) return image.image_url;

  await supabaseAdmin.from('work_images').update({ image_url: url }).eq('id', image.id);
  await removeStoredImages([image.image_url]);
  return url;
}

/**
 * Make one image the album's cover: clear the flag on its siblings and point
 * works.featured_image_url at it.
 */
export async function setFeaturedImage(workId: string, imageId: string): Promise<void> {
  const { data: image } = await supabaseAdmin
    .from('work_images')
    .select('id, image_url, original_path')
    .eq('id', imageId)
    .eq('work_id', workId)
    .maybeSingle();
  if (!image) return;

  await supabaseAdmin.from('work_images').update({ is_featured: false }).eq('work_id', workId);
  await supabaseAdmin.from('work_images').update({ is_featured: true }).eq('id', imageId);

  const url = await ensureCleanPreview(workId, image);
  await supabaseAdmin.from('works').update({ featured_image_url: url }).eq('id', workId);
}
