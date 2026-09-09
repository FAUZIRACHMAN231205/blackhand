import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/lib/apiAuth';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const [worksResult, featuredResult, worksIdsResult] = await Promise.all([
    supabaseAdmin.from('works').select('id', { count: 'exact', head: true }).eq('created_by', auth.user.id),
    supabaseAdmin
      .from('works')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', auth.user.id)
      .eq('is_featured', true),
    supabaseAdmin.from('works').select('id').eq('created_by', auth.user.id),
  ]);

  const workIds = (worksIdsResult.data ?? []).map((w) => w.id);
  let totalImages = 0;
  if (workIds.length > 0) {
    const { count } = await supabaseAdmin
      .from('work_images')
      .select('id', { count: 'exact', head: true })
      .in('work_id', workIds);
    totalImages = count ?? 0;
  }

  return NextResponse.json({
    totalWorks: worksResult.count ?? 0,
    totalImages,
    featuredWorks: featuredResult.count ?? 0,
  });
}
