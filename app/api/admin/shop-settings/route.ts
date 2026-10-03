import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { getShippingFee } from '@/app/lib/products';
import { validateShippingFee } from '@/app/lib/shop';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  return NextResponse.json({ shippingFeeIdr: await getShippingFee() });
}

/** Change the flat shipping fee. Orders already opened keep the fee they were quoted. */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  let fee: unknown;
  try {
    ({ shipping_fee_idr: fee } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const invalid = validateShippingFee(fee);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('shop_settings')
    .upsert({ id: 1, shipping_fee_idr: fee, updated_at: new Date().toISOString() });

  if (error) {
    console.error('Error saving shop settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }

  return NextResponse.json({ shippingFeeIdr: fee });
}
