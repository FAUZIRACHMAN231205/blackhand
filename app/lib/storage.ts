import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';

/** Public bucket: holds only what a visitor is allowed to see (previews). */
export const WORK_IMAGES_BUCKET = 'work-images';
/** Private bucket: full-resolution originals, reachable only via signed URLs. */
export const WORK_ORIGINALS_BUCKET = 'work-originals';

/**
 * Derive the object path inside the public bucket from a Supabase public URL:
 *   https://<project>.supabase.co/storage/v1/object/public/work-images/works/<id>/<file>
 * Returns null for anything that is not a URL in our bucket.
 */
export function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${WORK_IMAGES_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const path = url.slice(index + marker.length).split('?')[0];
  return path ? decodeURIComponent(path) : null;
}

/**
 * Best-effort removal of public preview files. Never throws: the database row
 * is the source of truth, so a failed cleanup is logged rather than failing a
 * request the caller already committed.
 */
export async function removeStoredImages(urls: (string | null | undefined)[]): Promise<void> {
  const paths = urls.map(storagePathFromPublicUrl).filter((p): p is string => p !== null);
  if (paths.length === 0) return;

  const { error } = await supabaseAdmin.storage.from(WORK_IMAGES_BUCKET).remove(paths);
  if (error) console.error('Failed to remove preview images:', paths, error);
}

/** Best-effort removal of private originals. */
export async function removeOriginals(paths: (string | null | undefined)[]): Promise<void> {
  const clean = paths.filter((p): p is string => !!p);
  if (clean.length === 0) return;

  const { error } = await supabaseAdmin.storage.from(WORK_ORIGINALS_BUCKET).remove(clean);
  if (error) console.error('Failed to remove originals:', clean, error);
}

/** Read a full-resolution original back out of the private bucket. */
export async function downloadOriginal(path: string): Promise<Buffer | null> {
  const { data, error } = await supabaseAdmin.storage.from(WORK_ORIGINALS_BUCKET).download(path);
  if (error || !data) {
    console.error('Failed to download original:', path, error);
    return null;
  }
  return Buffer.from(await data.arrayBuffer());
}

/** Upload (or replace) a public preview and return its public URL. */
export async function uploadPreview(path: string, body: Buffer): Promise<string | null> {
  const { error } = await supabaseAdmin.storage
    .from(WORK_IMAGES_BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', upsert: true });

  if (error) {
    console.error('Failed to upload preview:', path, error);
    return null;
  }
  const { data } = supabaseAdmin.storage.from(WORK_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Short-lived download link for an original. Only ever handed to a buyer whose
 * entitlement has already been checked.
 */
export async function signOriginalUrl(path: string, expiresInSeconds = 300): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(WORK_ORIGINALS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    console.error('Failed to sign original URL:', path, error);
    return null;
  }
  return data.signedUrl;
}

/** Deterministic object keys so preview and original stay paired. */
export function originalKey(workId: string, fileId: string, ext: string) {
  return `works/${workId}/${fileId}.${ext}`;
}
export function previewKey(workId: string, fileId: string, unlocked: boolean) {
  return `works/${workId}/${fileId}-${unlocked ? 'preview' : 'locked'}.jpg`;
}
