import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  try {
    const { rating } = await request.json();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('work_ratings').upsert(
      {
        work_id: id,
        user_id: auth.user.id,
        rating,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'work_id, user_id' }
    );

    if (error) {
      console.error('Error submitting rating:', error);
      return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Submit rating error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg || 'Internal server error' }, { status: 500 });
  }
}
