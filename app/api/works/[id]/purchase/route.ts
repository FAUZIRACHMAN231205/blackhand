import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { requireUser } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { hasPurchased, findResumableWorkCheckout } from '@/app/lib/orders';
import {
  createSnapTransaction,
  isMidtransConfigured,
  WORK_ORDER_PREFIX,
} from '@/app/lib/midtrans';
import {
  PAYMENT_WINDOW_MINUTES,
  RESERVATION_GRACE_MINUTES,
  formatClock,
  isReserved,
} from '@/app/lib/sales';

interface ClaimedOrder {
  id: string;
  amount_idr: number;
  work_title: string;
  created_at: string;
  expires_at: string;
}

/**
 * Opens a Midtrans Snap checkout for one work. A work is sold to exactly one
 * buyer: this reserves it for the caller for the payment window, and refuses
 * anyone else until that reservation lapses or the work is sold.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  if (!isMidtransConfigured()) {
    return NextResponse.json({ error: 'Pembayaran belum dikonfigurasi.' }, { status: 503 });
  }

  const { data: work } = await supabaseAdmin
    .from('works')
    .select('id, title, price_idr, is_for_sale, is_published, sold_at, reserved_until')
    .eq('id', id)
    .maybeSingle();

  if (!work || !work.is_published) {
    return NextResponse.json({ error: 'Karya tidak ditemukan.' }, { status: 404 });
  }
  if (work.sold_at) {
    const mine = await hasPurchased(auth.user.id, id);
    return NextResponse.json(
      { error: mine ? 'Anda sudah memiliki karya ini.' : 'Karya ini sudah terjual.' },
      { status: 409 }
    );
  }
  if (!work.is_for_sale || !work.price_idr) {
    return NextResponse.json({ error: 'Karya ini tidak dijual.' }, { status: 400 });
  }

  // Pressing "Buy" again reopens the same payment rather than starting another.
  const resumable = await findResumableWorkCheckout(auth.user.id, id);
  if (resumable) {
    return NextResponse.json({ orderId: resumable.orderId, token: resumable.token, resumed: true });
  }

  const providerOrderId = `${WORK_ORDER_PREFIX}${crypto.randomUUID()}`;
  const { data: claimed, error: claimError } = await supabaseAdmin.rpc('claim_work_for_checkout', {
    p_work_id: id,
    p_user_id: auth.user.id,
    p_provider_order_id: providerOrderId,
    p_pay_minutes: PAYMENT_WINDOW_MINUTES,
    p_grace_minutes: RESERVATION_GRACE_MINUTES,
  });

  if (claimError) {
    console.error('Error claiming work for checkout:', claimError);
    return NextResponse.json({ error: 'Gagal membuat pesanan.' }, { status: 500 });
  }

  const order = (claimed as ClaimedOrder[] | null)?.[0];
  if (!order) {
    // Lost the race, or someone was already paying. Re-read for a useful message.
    const { data: now } = await supabaseAdmin
      .from('works')
      .select('sold_at, reserved_until')
      .eq('id', id)
      .maybeSingle();

    if (now?.sold_at) {
      return NextResponse.json({ error: 'Karya ini sudah terjual.' }, { status: 409 });
    }
    const until = now && isReserved(now) ? now.reserved_until : null;
    return NextResponse.json(
      {
        error: until
          ? `Karya ini sedang dalam proses pembelian oleh orang lain. Coba lagi setelah pukul ${formatClock(until)} WIB.`
          : 'Karya ini sedang dalam proses pembelian oleh orang lain. Coba lagi nanti.',
        reservedUntil: until,
      },
      { status: 409 }
    );
  }

  try {
    const snap = await createSnapTransaction({
      orderId: providerOrderId,
      items: [{ id: work.id, price: order.amount_idr, quantity: 1, name: order.work_title }],
      customerEmail: auth.user.email,
      customerName: auth.user.full_name,
      startedAt: new Date(order.created_at),
      payMinutes: PAYMENT_WINDOW_MINUTES,
    });

    await supabaseAdmin.from('orders').update({ snap_token: snap.token }).eq('id', order.id);

    return NextResponse.json({ orderId: order.id, token: snap.token, redirectUrl: snap.redirectUrl });
  } catch (e) {
    // The transaction never opened: fail the order, which also frees the work.
    await supabaseAdmin.rpc('apply_work_order_notification', {
      p_order_id: order.id,
      p_status: 'failed',
      p_transaction_id: null,
      p_payment_type: null,
      p_raw: null,
    });
    console.error('Midtrans error:', e);
    return NextResponse.json({ error: 'Gagal menghubungi penyedia pembayaran.' }, { status: 502 });
  }
}
