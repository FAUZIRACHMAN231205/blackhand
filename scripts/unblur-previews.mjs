/**
 * One-off migration: rebuild every artwork preview that was stored blurred
 * under the old paywall as a clean one, from its private original.
 *
 * Run with:  node --env-file=.env.local scripts/unblur-previews.mjs
 *
 * Idempotent: only rows whose preview is a `-locked.jpg` file are touched, so it
 * is safe to re-run if it stops halfway. The app also heals a blurred preview
 * the next time that image is made a cover, but only this script fixes them all.
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUBLIC_BUCKET = 'work-images';
const PRIVATE_BUCKET = 'work-originals';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Run with: node --env-file=.env.local scripts/unblur-previews.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function publicPathFromUrl(url) {
  const marker = `/storage/v1/object/public/${PUBLIC_BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
}

// Same settings as makePreview() in app/lib/images.ts.
const cleanPreview = (buf) =>
  sharp(buf).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true }).toBuffer();

const { data: rows, error } = await sb
  .from('work_images')
  .select('id, work_id, image_url, original_path, is_featured')
  .like('image_url', '%-locked.%');

if (error) {
  console.error('Could not read work_images:', error.message);
  process.exit(1);
}

if (!rows?.length) {
  console.log('Nothing to do — no blurred previews left.');
  process.exit(0);
}

console.log(`Rebuilding ${rows.length} blurred preview(s)...\n`);
let done = 0;

for (const img of rows) {
  if (!img.original_path) {
    console.warn(`  ! skip ${img.id}: no private original to rebuild from`);
    continue;
  }

  const { data: blob, error: dlErr } = await sb.storage.from(PRIVATE_BUCKET).download(img.original_path);
  if (dlErr || !blob) {
    console.warn(`  ! skip ${img.id}: cannot download original (${dlErr?.message})`);
    continue;
  }

  const fileId = img.original_path.split('/').pop().replace(/\.[^.]+$/, '');
  const previewPath = `works/${img.work_id}/${fileId}-preview.jpg`;
  const preview = await cleanPreview(Buffer.from(await blob.arrayBuffer()));

  const { error: upErr } = await sb.storage
    .from(PUBLIC_BUCKET)
    .upload(previewPath, preview, { contentType: 'image/jpeg', upsert: true });
  if (upErr) {
    console.warn(`  ! skip ${img.id}: cannot store preview (${upErr.message})`);
    continue;
  }

  const { data: pub } = sb.storage.from(PUBLIC_BUCKET).getPublicUrl(previewPath);
  const { error: rowErr } = await sb.from('work_images').update({ image_url: pub.publicUrl }).eq('id', img.id);
  if (rowErr) {
    console.warn(`  ! skip ${img.id}: cannot update row (${rowErr.message})`);
    continue;
  }

  if (img.is_featured) {
    await sb.from('works').update({ featured_image_url: pub.publicUrl }).eq('id', img.work_id);
  }

  const oldPath = publicPathFromUrl(img.image_url);
  if (oldPath && oldPath !== previewPath) await sb.storage.from(PUBLIC_BUCKET).remove([oldPath]);

  done += 1;
  console.log(`  ✓ ${img.id} -> clean (${Math.round(preview.length / 1024)} KB)`);
}

console.log(`\nDone: ${done}/${rows.length} preview(s) rebuilt.`);
