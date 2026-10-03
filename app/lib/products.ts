import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';

/** Columns a shopper may see. */
export const PUBLIC_PRODUCT_COLUMNS = 'id, name, description, price_idr, stock, cover_image_url, created_at';

/** The flat shipping fee the admin has set, in rupiah. */
export async function getShippingFee(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('shop_settings')
    .select('shipping_fee_idr')
    .eq('id', 1)
    .maybeSingle();

  if (error) console.error('Error reading shop settings:', error);
  return data?.shipping_fee_idr ?? 0;
}

/**
 * Keep products.cover_image_url on an image that still exists: the first by
 * display order, or none.
 */
export async function syncProductCover(productId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('product_images')
    .select('image_url')
    .eq('product_id', productId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  await supabaseAdmin
    .from('products')
    .update({ cover_image_url: data?.image_url ?? null, updated_at: new Date().toISOString() })
    .eq('id', productId);
}
