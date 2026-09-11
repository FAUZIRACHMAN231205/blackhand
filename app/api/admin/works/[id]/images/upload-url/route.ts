import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { WORK_ORIGINALS_BUCKET, originalKey } from '@/app/lib/storage';
import {
  MAX_IMAGES_PER_WORK,
  MAX_IMAGE_BYTES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
} from '@/app/lib/categories';

/**
 * Hands out a signed slot in the PRIVATE originals bucket. The uploaded file is
 * the deliverable, so it never gets a public URL; the public preview is derived
 * from it afterwards by POST /api/admin/works/[id]/images.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const { data: work } = await supabaseAdmin
    .from('works')
    .select('id, created_by')
    .eq('id', id)
    .maybeSingle();

  if (!work) return NextResponse.json({ error: 'Work not found' }, { status: 404 });
  if (work.created_by !== auth.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { fileName, contentType, size } = await request.json();
    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    const ext = (fileName.split('.').pop() || '').toLowerCase();
    if (!(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }
    if (contentType !== undefined && !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType)) {
      return NextResponse.json({ error: 'Only image uploads are allowed' }, { status: 400 });
    }
    if (typeof size === 'number' && size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `Image is too large (max ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB)` },
        { status: 400 }
      );
    }

    // Refuse to hand out an upload slot once the album is full.
    const { count } = await supabaseAdmin
      .from('work_images')
      .select('id', { count: 'exact', head: true })
      .eq('work_id', id);

    if ((count ?? 0) >= MAX_IMAGES_PER_WORK) {
      return NextResponse.json(
        { error: `A work can have at most ${MAX_IMAGES_PER_WORK} images` },
        { status: 400 }
      );
    }

    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const originalPath = originalKey(id, fileId, ext);

    const { data, error } = await supabaseAdmin.storage
      .from(WORK_ORIGINALS_BUCKET)
      .createSignedUploadUrl(originalPath);

    if (error || !data) {
      console.error('Error creating signed upload URL:', error);
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
    }

    return NextResponse.json({
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      originalPath,
      fileId,
    });
  } catch (error: unknown) {
    console.error('Upload URL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
