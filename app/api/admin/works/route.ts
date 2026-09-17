import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { WORK_CATEGORIES, isValidCategory, validatePricing } from '@/app/lib/categories';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from('works')
    .select('id, title, category, is_published, is_featured, created_at, price_idr, is_for_sale')
    .eq('created_by', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching works:', error);
    return NextResponse.json({ error: 'Failed to fetch works' }, { status: 500 });
  }

  return NextResponse.json({ works: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { title, description, category, is_published, featured_image_url, price_idr, is_for_sale } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!isValidCategory(category)) {
      return NextResponse.json(
        { error: `Category must be one of: ${WORK_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    const priceError = validatePricing(price_idr, is_for_sale);
    if (priceError) {
      return NextResponse.json({ error: priceError }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('works')
      .insert({
        title: title.trim(),
        description: (description ?? '').trim(),
        category,
        created_by: auth.user.id,
        is_published: is_published ?? true,
        featured_image_url: featured_image_url ?? null,
        price_idr: price_idr ?? null,
        is_for_sale: Boolean(is_for_sale),
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating work:', error);
      return NextResponse.json({ error: 'Failed to create work' }, { status: 500 });
    }

    return NextResponse.json({ work: data });
  } catch (error: unknown) {
    console.error('Create work error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg || 'Internal server error' }, { status: 500 });
  }
}
