import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { PRODUCT_IMAGES_BUCKET, productUploadKey } from '@/app/lib/storage';
import { MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES, ALLOWED_IMAGE_EXTENSIONS } from '@/app/lib/categories';
import { MAX_IMAGES_PER_PRODUCT } from '@/app/lib/shop';

/**
 * A signed slot for one raw product photo. The upload is resized and replaced
 * by POST /api/admin/products/[id]/images before the shop ever shows it.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const { data: product } = await supabaseAdmin.from('products').select('id').eq('id', id).maybeSingle();
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  let body: { fileName?: unknown; contentType?: unknown; size?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { fileName, contentType, size } = body;
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
  if (contentType !== undefined && !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType as string)) {
    return NextResponse.json({ error: 'Only image uploads are allowed' }, { status: 400 });
  }
  if (typeof size === 'number' && size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `Image is too large (max ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB)` },
      { status: 400 }
    );
  }

  const { count } = await supabaseAdmin
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id);
  if ((count ?? 0) >= MAX_IMAGES_PER_PRODUCT) {
    return NextResponse.json(
      { error: `A product can have at most ${MAX_IMAGES_PER_PRODUCT} photos` },
      { status: 400 }
    );
  }

  const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = productUploadKey(id, fileId, ext);

  const { data, error } = await supabaseAdmin.storage.from(PRODUCT_IMAGES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('Error creating product upload URL:', error);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token, uploadPath: path, fileId });
}
