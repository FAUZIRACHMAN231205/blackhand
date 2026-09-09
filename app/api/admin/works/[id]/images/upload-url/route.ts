import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

const BUCKET = 'work-images';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const { data: work } = await supabaseAdmin
    .from('works')
    .select('id, created_by')
    .eq('id', id)
    .maybeSingle();

  if (!work) return NextResponse.json({ error: 'Work not found' }, { status: 404 });
  if (work.created_by !== auth.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { fileName } = await request.json();
    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    const ext = fileName.split('.').pop() || 'jpg';
    const path = `works/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);

    if (error || !data) {
      console.error('Error creating signed upload URL:', error);
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: publicUrlData.publicUrl,
    });
  } catch (error: unknown) {
    console.error('Upload URL error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg || 'Internal server error' }, { status: 500 });
  }
}
