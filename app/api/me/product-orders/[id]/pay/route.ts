import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { paymentDeadline } from '@/app/lib/sales';

/** Reopen the Snap payment for one of the caller's unpaid orders. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const { data: order } = await supabaseAdmin
    .from('product_orders')
    .select('id, status, snap_token, created_at')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });
  }
  if (order.status !== 'pending' || !order.snap_token) {
    return NextResponse.json({ error: 'Pesanan ini tidak menunggu pembayaran.' }, { status: 409 });
  }
  if (paymentDeadline(order.created_at).getTime() <= Date.now() + 60_000) {
    return NextResponse.json(
      { error: 'Waktu pembayaran sudah habis. Silakan buat pesanan baru.' },
      { status: 409 }
    );
  }

  return NextResponse.json({ token: order.snap_token });
}
