import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    if (content.length > 500) {
      return NextResponse.json({ error: 'Content is too long (max 500 characters)' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('work_comments')
      .insert({
        work_id: id,
        user_id: auth.user.id,
        user_name: auth.user.full_name || auth.user.email.split('@')[0],
        user_avatar: auth.user.avatar_url,
        content: content.trim(),
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error adding comment:', error);
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }

    return NextResponse.json({ comment: data });
  } catch (error: unknown) {
    console.error('Add comment error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg || 'Internal server error' }, { status: 500 });
  }
}
