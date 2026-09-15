import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { requireUser } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { hasPurchased } from '@/app/lib/orders';
import { createSnapTransaction, isMidtransConfigured } from '@/app/lib/midtrans';

/** Opens a Midtrans Snap transaction for one album and records a pending order. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  if (!isMidtransConfigured()) {
    return NextResponse.json({ error: 'Pembayaran belum dikonfigurasi.' }, { status: 503 });
  }

  const { data: work } = await supabaseAdmin
    .from('works')
    .select('id, title, price_idr, is_for_sale, is_published')
    .eq('id', id)
    .maybeSingle();

  if (!work || !work.is_published) {
    return NextResponse.json({ error: 'Album tidak ditemukan.' }, { status: 404 });
  }
  if (!work.is_for_sale || !work.price_idr) {
    return NextResponse.json({ error: 'Album ini tidak dijual.' }, { status: 400 });
  }
  if (await hasPurchased(auth.user.id, id)) {
    return NextResponse.json({ error: 'Anda sudah memiliki album ini.' }, { status: 409 });
  }

  // Record the order before talking to Midtrans, so any notification that comes
  // back can always be matched to something we already know about.
  const providerOrderId = `BH-${crypto.randomUUID()}`;

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: auth.user.id,
      work_id: id,
      work_title: work.title,
      amount_idr: work.price_idr,
      status: 'pending',
      provider: 'midtrans',
      provider_order_id: providerOrderId,
    })
    .select('id')
    .single();

  if (error || !order) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Gagal membuat pesanan.' }, { status: 500 });
  }

  try {
    const snap = await createSnapTransaction({
      orderId: providerOrderId,
      amountIdr: work.price_idr,
      itemId: work.id,
      itemName: work.title,
      customerEmail: auth.user.email,
      customerName: auth.user.full_name,
    });

    return NextResponse.json({
      orderId: order.id,
      token: snap.token,
      redirectUrl: snap.redirectUrl,
    });
  } catch (e) {
    // Don't leave a pending order behind for a transaction that never opened.
    await supabaseAdmin.from('orders').update({ status: 'failed' }).eq('id', order.id);
    console.error('Midtrans error:', e);
    return NextResponse.json({ error: 'Gagal menghubungi penyedia pembayaran.' }, { status: 502 });
  }
}
