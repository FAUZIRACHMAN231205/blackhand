import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/app/lib/apiAuth';
import { hasPurchased } from '@/app/lib/orders';
import {
  loadAlbumOriginals,
  asJpeg,
  buildAlbumZip,
  buildAlbumPdf,
  numberedName,
  fileSlug,
} from '@/app/lib/albumFiles';

export const runtime = 'nodejs';
// Six full-resolution originals can take a while to fetch and pack.
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function attachment(body: Uint8Array | Buffer, filename: string, contentType: string) {
  return new Response(new Blob([new Uint8Array(body)]), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(body.byteLength),
      // Paid content: never let a shared cache hold on to it.
      'Cache-Control': 'private, no-store',
    },
  });
}

/**
 * GET /api/works/[id]/download?format=jpg&image=<imageId>  — one image
 * GET /api/works/[id]/download?format=zip                  — every image, zipped
 * GET /api/works/[id]/download?format=pdf                  — every image, one per page
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  if (!UUID_RE.test(id) || !(await hasPurchased(auth.user.id, id))) {
    return NextResponse.json({ error: 'Anda belum memiliki album ini.' }, { status: 403 });
  }

  const format = request.nextUrl.searchParams.get('format');
  const imageId = request.nextUrl.searchParams.get('image');

  try {
    if (format === 'jpg') {
      if (!imageId || !UUID_RE.test(imageId)) {
        return NextResponse.json({ error: 'Gambar tidak valid.' }, { status: 400 });
      }
      const album = await loadAlbumOriginals(id, imageId);
      if (!album) return NextResponse.json({ error: 'Gambar tidak ditemukan.' }, { status: 404 });

      const [original] = album.originals;
      const jpeg = await asJpeg(original);
      return attachment(jpeg, numberedName(album.title, original.position, 'jpg'), 'image/jpeg');
    }

    if (format === 'zip' || format === 'pdf') {
      const album = await loadAlbumOriginals(id);
      if (!album) return NextResponse.json({ error: 'Album tidak ditemukan.' }, { status: 404 });

      if (format === 'zip') {
        return attachment(await buildAlbumZip(album), `${fileSlug(album.title)}.zip`, 'application/zip');
      }
      return attachment(await buildAlbumPdf(album), `${fileSlug(album.title)}.pdf`, 'application/pdf');
    }

    return NextResponse.json({ error: 'Format harus jpg, zip, atau pdf.' }, { status: 400 });
  } catch (error) {
    console.error('Album download failed:', error);
    return NextResponse.json({ error: 'Gagal menyiapkan unduhan.' }, { status: 500 });
  }
}
