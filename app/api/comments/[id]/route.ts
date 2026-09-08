import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/app/lib/apiAuth';
import { isAdmin } from '@/app/lib/adminUtils';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const { data: comment } = await supabaseAdmin
    .from('work_comments')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();

  if (!comment) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  const isOwner = comment.user_id === auth.user.id;
  if (!isOwner && !isAdmin(auth.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from('work_comments').delete().eq('id', id);

  if (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
