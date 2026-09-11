/**
 * One-off migration: move existing full-resolution images out of the public
 * bucket into the private one, and replace what the public bucket serves with
 * derived previews (one clean cover per album, the rest pre-blurred).
 *
 * Run with:  node --env-file=.env.local scripts/migrate-originals.mjs
 *
 * Idempotent: rows that already have an original_path are skipped, so it is
 * safe to re-run if it stops halfway.
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUBLIC_BUCKET = 'work-images';
const PRIVATE_BUCKET = 'work-originals';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Run with: node --env-file=.env.local scripts/migrate-originals.mjs');
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

const cleanPreview = (buf) =>
  sharp(buf).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true }).toBuffer();

const blurredPreview = (buf) =>
  sharp(buf).rotate().resize({ width: 420, height: 420, fit: 'inside', withoutEnlargement: true })
    .blur(18).jpeg({ quality: 60, mozjpeg: true }).toBuffer();

const { data: pending, error } = await sb
  .from('work_images')
  .select('id, work_id, image_url, is_featured, display_order')
  .is('original_path', null)
  .order('work_id')
  .order('display_order');

if (error) {
  console.error('Could not read work_images:', error.message);
  process.exit(1);
}

if (!pending?.length) {
  console.log('Nothing to migrate — every image already has an original_path.');
  process.exit(0);
}

console.log(`Migrating ${pending.length} image(s)...\n`);
const touchedWorks = new Set();
let done = 0;

for (const img of pending) {
  const oldPath = publicPathFromUrl(img.image_url);
  if (!oldPath) {
    console.warn(`  ! skip ${img.id}: image_url is not in the public bucket`);
    continue;
  }

  const { data: blob, error: dlErr } = await sb.storage.from(PUBLIC_BUCKET).download(oldPath);
  if (dlErr || !blob) {
    console.warn(`  ! skip ${img.id}: cannot download ${oldPath} (${dlErr?.message})`);
    continue;
  }
  const buf = Buffer.from(await blob.arrayBuffer());

  const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ext = (oldPath.split('.').pop() || 'jpg').toLowerCase();
  const originalPath = `works/${img.work_id}/${fileId}.${ext}`;

  const { error: upErr } = await sb.storage
    .from(PRIVATE_BUCKET)
    .upload(originalPath, buf, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (upErr) {
    console.warn(`  ! skip ${img.id}: cannot store original (${upErr.message})`);
    continue;
  }

  const unlocked = Boolean(img.is_featured);
  const previewPath = `works/${img.work_id}/${fileId}-${unlocked ? 'preview' : 'locked'}.jpg`;
  const preview = unlocked ? await cleanPreview(buf) : await blurredPreview(buf);

  const { error: pvErr } = await sb.storage
    .from(PUBLIC_BUCKET)
    .upload(previewPath, preview, { contentType: 'image/jpeg', upsert: true });
  if (pvErr) {
    console.warn(`  ! skip ${img.id}: cannot store preview (${pvErr.message})`);
    continue;
  }

  const { data: pub } = sb.storage.from(PUBLIC_BUCKET).getPublicUrl(previewPath);

  await sb.from('work_images')
    .update({ original_path: originalPath, image_url: pub.publicUrl })
    .eq('id', img.id);

  // The full-resolution file must not stay publicly reachable.
  await sb.storage.from(PUBLIC_BUCKET).remove([oldPath]);

  if (unlocked) {
    await sb.from('works').update({ featured_image_url: pub.publicUrl }).eq('id', img.work_id);
  }

  touchedWorks.add(img.work_id);
  done += 1;
  console.log(`  ✓ ${img.id} -> ${unlocked ? 'clean cover' : 'blurred'} (${Math.round(preview.length / 1024)} KB)`);
}

// Any album left without a cover gets its first image promoted.
for (const workId of touchedWorks) {
  const { data: imgs } = await sb
    .from('work_images')
    .select('id, image_url, is_featured, display_order')
    .eq('work_id', workId)
    .order('display_order');

  if (imgs?.length && !imgs.some((i) => i.is_featured)) {
    console.log(`  … work ${workId} had no cover; promoting its first image`);
    await sb.from('work_images').update({ is_featured: true }).eq('id', imgs[0].id);
    await sb.from('works').update({ featured_image_url: imgs[0].image_url }).eq('id', workId);
  }
}

console.log(`\nDone: ${done}/${pending.length} image(s) migrated across ${touchedWorks.size} album(s).`);
