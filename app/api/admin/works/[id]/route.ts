import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { removeStoredImages, removeOriginals } from '@/app/lib/storage';
import { WORK_CATEGORIES, isValidCategory, validatePricing } from '@/app/lib/categories';

async function assertOwnedWork(workId: string, userId: string) {
  const { data } = await supabaseAdmin
    .from('works')
    .select('id, created_by')
    .eq('id', workId)
    .maybeSingle();

  if (!data) return { ok: false as const, status: 404, message: 'Work not found' };
  if (data.created_by !== userId) return { ok: false as const, status: 403, message: 'Forbidden' };
  return { ok: true as const };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const { data: work, error: workError } = await supabaseAdmin
    .from('works')
    .select('*')
    .eq('id', id)
    .single();

  if (workError || !work) {
    return NextResponse.json({ error: 'Work not found' }, { status: 404 });
  }
  if (work.created_by !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: images } = await supabaseAdmin
    .from('work_images')
    .select('*')
    .eq('work_id', id)
    .order('display_order', { ascending: true });

  return NextResponse.json({ work, images: images ?? [] });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const ownership = await assertOwnedWork(id, auth.user.id);
  if (!ownership.ok) {
    return NextResponse.json({ error: ownership.message }, { status: ownership.status });
  }

  try {
    const body = await request.json();
    const { title, description, category, is_published, price_idr, is_for_sale } = body;

    if (title !== undefined && !String(title).trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (category !== undefined && !isValidCategory(category)) {
      return NextResponse.json(
        { error: `Category must be one of: ${WORK_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (price_idr !== undefined || is_for_sale !== undefined) {
      // Fall back to the stored values so a partial update is still validated
      // as a whole: you cannot flip is_for_sale on without a usable price.
      const { data: current } = await supabaseAdmin
        .from('works')
        .select('price_idr, is_for_sale')
        .eq('id', id)
        .maybeSingle();

      const nextPrice = price_idr !== undefined ? price_idr : current?.price_idr ?? null;
      const nextForSale = is_for_sale !== undefined ? is_for_sale : current?.is_for_sale ?? false;

      const priceError = validatePricing(nextPrice, nextForSale);
      if (priceError) {
        return NextResponse.json({ error: priceError }, { status: 400 });
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = String(title).trim();
    if (description !== undefined) updates.description = String(description).trim();
    if (category !== undefined) updates.category = category;
    if (is_published !== undefined) updates.is_published = is_published;
    if (price_idr !== undefined) updates.price_idr = price_idr;
    if (is_for_sale !== undefined) updates.is_for_sale = Boolean(is_for_sale);

    const { error } = await supabaseAdmin.from('works').update(updates).eq('id', id);

    if (error) {
      console.error('Error updating work:', error);
      return NextResponse.json({ error: 'Failed to update work' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Update work error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const ownership = await assertOwnedWork(id, auth.user.id);
  if (!ownership.ok) {
    return NextResponse.json({ error: ownership.message }, { status: ownership.status });
  }

  // An album someone paid for must survive: deleting it would strip a buyer of
  // what they own. (The FK is ON DELETE RESTRICT; this gives a clear message.)
  const { count: paidOrders } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('work_id', id)
    .eq('status', 'paid');

  if ((paidOrders ?? 0) > 0) {
    return NextResponse.json(
      { error: 'This album has been purchased and cannot be deleted. Unpublish it instead.' },
      { status: 409 }
    );
  }

  // Collect the stored files before the cascade removes their rows.
  const { data: images } = await supabaseAdmin
    .from('work_images')
    .select('image_url, original_path')
    .eq('work_id', id);

  const { error } = await supabaseAdmin.from('works').delete().eq('id', id);

  if (error) {
    console.error('Error deleting work:', error);
    return NextResponse.json({ error: 'Failed to delete work' }, { status: 500 });
  }

  await removeStoredImages((images ?? []).map((img) => img.image_url));
  await removeOriginals((images ?? []).map((img) => img.original_path));

  return NextResponse.json({ success: true });
}
