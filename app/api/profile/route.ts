import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { setSessionCookie } from '@/app/lib/session';

export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;

  try {
    const { full_name } = await request.json();

    if (typeof full_name !== 'string') {
      return NextResponse.json({ error: 'full_name is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ full_name: full_name.trim() })
      .eq('id', auth.user.id)
      .select('id, email, full_name, avatar_url, provider, created_at, last_sign_in_at')
      .single();

    if (error || !data) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    // Refresh the session cookie so the new name is reflected immediately.
    await setSessionCookie(data);

    return NextResponse.json({ user: data });
  } catch (error: unknown) {
    console.error('Update profile error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg || 'Internal server error' }, { status: 500 });
  }
}
