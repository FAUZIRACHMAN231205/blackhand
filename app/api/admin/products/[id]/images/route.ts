import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { PRODUCT_IMAGES_BUCKET, productImageKey, removeProductImages } from '@/app/lib/storage';
import { makePreview } from '@/app/lib/images';
import { syncProductCover } from '@/app/lib/products';
import { MAX_IMAGES_PER_PRODUCT } from '@/app/lib/shop';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Turn a just-uploaded raw photo into the shop's image: resized to a clean
 * JPEG (EXIF orientation applied, metadata dropped), with the raw file removed.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  let uploadPath: unknown;
  try {
    ({ uploadPath } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Pin the path to this product's raw uploads, so a request can't claim some
  // other file in the bucket.
  const match =
    typeof uploadPath === 'string'
      ? uploadPath.match(new RegExp(`^products/${id}/([A-Za-z0-9-]+)-upload\\.[a-z0-9]+$`))
      : null;
  if (!match) {
    return NextResponse.json({ error: 'A valid uploadPath is required' }, { status: 400 });
  }
  const fileId = match[1];
  const rawPath = uploadPath as string;

  const { data: product } = await supabaseAdmin.from('products').select('id').eq('id', id).maybeSingle();
  if (!product) {
    await removeProductImages([rawPath]);
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const { data: existing } = await supabaseAdmin
    .from('product_images')
    .select('display_order')
    .eq('product_id', id)
    .order('display_order', { ascending: false });

  if ((existing?.length ?? 0) >= MAX_IMAGES_PER_PRODUCT) {
    await removeProductImages([rawPath]);
    return NextResponse.json(
      { error: `A product can have at most ${MAX_IMAGES_PER_PRODUCT} photos` },
      { status: 400 }
    );
  }

  const { data: raw, error: downloadError } = await supabaseAdmin.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .download(rawPath);
  if (downloadError || !raw) {
    console.error('Failed to read uploaded product photo:', rawPath, downloadError);
    return NextResponse.json({ error: 'Uploaded photo not found' }, { status: 400 });
  }

  let resized: Buffer;
  try {
    resized = await makePreview(Buffer.from(await raw.arrayBuffer()));
  } catch (error) {
    console.error('Failed to process product photo:', error);
    await removeProductImages([rawPath]);
    return NextResponse.json({ error: 'That file could not be read as an image' }, { status: 400 });
  }

  const finalPath = productImageKey(id, fileId);
  const { error: uploadError } = await supabaseAdmin.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(finalPath, resized, { contentType: 'image/jpeg', upsert: true });
  await removeProductImages([rawPath]);

  if (uploadError) {
    console.error('Failed to store product photo:', uploadError);
    return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 });
  }

  const { data: publicUrl } = supabaseAdmin.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(finalPath);
  const nextOrder = (existing?.[0]?.display_order ?? 0) + 1;

  const { data: image, error } = await supabaseAdmin
    .from('product_images')
    .insert({
      product_id: id,
      image_url: publicUrl.publicUrl,
      storage_path: finalPath,
      display_order: nextOrder,
    })
    .select('id, image_url, display_order')
    .single();

  if (error || !image) {
    console.error('Error saving product image:', error);
    await removeProductImages([finalPath]);
    return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 });
  }

  await syncProductCover(id);
  return NextResponse.json({ image });
}
