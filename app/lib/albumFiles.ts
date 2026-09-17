import 'server-only';
import sharp from 'sharp';
import { zipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
import { supabaseAdmin } from './supabaseAdmin';
import { downloadOriginal } from './storage';

/**
 * Everything a buyer can take away from an album is built here, straight from
 * the private originals — never from the public previews.
 *
 * Callers must have checked ownership first; nothing in this module does.
 */

export interface AlbumOriginal {
  imageId: string;
  /** 1-based position in the album, used for stable file names. */
  position: number;
  ext: string;
  buffer: Buffer;
}

export interface LoadedAlbum {
  title: string;
  originals: AlbumOriginal[];
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function mimeForExt(ext: string): string {
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

/** ASCII-only, filesystem-safe base name, e.g. "Irreplaceable Pt. 2" → "irreplaceable-pt-2". */
export function fileSlug(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'album';
}

export function numberedName(title: string, position: number, ext: string): string {
  return `${fileSlug(title)}-${String(position).padStart(2, '0')}.${ext}`;
}

/**
 * Load an album's originals in display order. Pass `imageId` to load just one.
 * Returns null when the album or the requested image doesn't exist.
 */
export async function loadAlbumOriginals(
  workId: string,
  imageId?: string
): Promise<LoadedAlbum | null> {
  const { data: work } = await supabaseAdmin
    .from('works')
    .select('title')
    .eq('id', workId)
    .maybeSingle();
  if (!work) return null;

  const { data: rows } = await supabaseAdmin
    .from('work_images')
    .select('id, original_path, display_order')
    .eq('work_id', workId)
    .order('display_order', { ascending: true });

  const withOriginals = (rows ?? []).filter((r) => r.original_path);
  const positioned = withOriginals.map((r, i) => ({ row: r, position: i + 1 }));
  const wanted = imageId ? positioned.filter((p) => p.row.id === imageId) : positioned;
  if (wanted.length === 0) return null;

  const originals = await Promise.all(
    wanted.map(async ({ row, position }) => {
      const path = row.original_path as string;
      const buffer = await downloadOriginal(path);
      if (!buffer) throw new Error(`Original missing from storage: ${path}`);
      return {
        imageId: row.id as string,
        position,
        ext: (path.split('.').pop() ?? 'jpg').toLowerCase(),
        buffer,
      };
    })
  );

  return { title: work.title as string, originals };
}

/**
 * A JPEG a buyer can open anywhere. JPEG originals pass through untouched so
 * nothing is lost to re-encoding; other formats are converted at high quality.
 */
export async function asJpeg(original: AlbumOriginal): Promise<Buffer> {
  if (original.ext === 'jpg' || original.ext === 'jpeg') return original.buffer;
  return sharp(original.buffer).rotate().toColorspace('srgb').jpeg({ quality: 95 }).toBuffer();
}

/** All originals as JPEGs in one archive. Stored, not deflated — JPEG doesn't compress further. */
export async function buildAlbumZip(album: LoadedAlbum): Promise<Uint8Array> {
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const original of album.originals) {
    const jpeg = await asJpeg(original);
    entries[numberedName(album.title, original.position, 'jpg')] = [new Uint8Array(jpeg), { level: 0 }];
  }
  return zipSync(entries);
}

/** A4 long edge in PDF points — keeps pages a sensible printed size. */
const PAGE_LONG_EDGE_PT = 842;

/**
 * One image per page, each page shaped to its image. The embedded image keeps
 * its full resolution; only the page's physical size is normalised.
 */
export async function buildAlbumPdf(album: LoadedAlbum): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(album.title);
  pdf.setProducer('BLACKHAND');
  pdf.setCreator('BLACKHAND');

  for (const original of album.originals) {
    // PDF viewers ignore EXIF orientation and choke on CMYK JPEGs, so every
    // page gets an upright sRGB JPEG regardless of what was uploaded.
    const jpeg = await sharp(original.buffer)
      .rotate()
      .toColorspace('srgb')
      .jpeg({ quality: 95 })
      .toBuffer();
    const image = await pdf.embedJpg(jpeg);

    const scale = PAGE_LONG_EDGE_PT / Math.max(image.width, image.height);
    const width = image.width * scale;
    const height = image.height * scale;

    const page = pdf.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }

  return pdf.save();
}
