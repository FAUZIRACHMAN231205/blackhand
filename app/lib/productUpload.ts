import { supabase } from './supabaseClient';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from './categories';
import type { ProductImage } from '../types';

/** Check a picked file against the same limits the API enforces. Returns an error, or null. */
export function checkPhotoFile(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Only JPG, PNG, WebP, AVIF or GIF images are allowed';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Image is too large (max ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB)`;
  }
  return null;
}

/**
 * Upload one product photo: a signed slot from our API, the raw file straight
 * to Storage (the upload token authorises it, no session needed), then the API
 * resizes it into the photo the shop shows. Throws with a readable message.
 */
export async function uploadProductPhoto(productId: string, file: File): Promise<ProductImage> {
  const slotRes = await fetch(`/api/admin/products/${productId}/images/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
  });
  const slot = await slotRes.json();
  if (!slotRes.ok) throw new Error(slot.error || 'Failed to prepare upload');

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .uploadToSignedUrl(slot.path, slot.token, file);
  if (uploadError) throw new Error('Failed to upload photo');

  const saveRes = await fetch(`/api/admin/products/${productId}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadPath: slot.uploadPath }),
  });
  const saved = await saveRes.json();
  if (!saveRes.ok) throw new Error(saved.error || 'Failed to save photo');

  return saved.image as ProductImage;
}
