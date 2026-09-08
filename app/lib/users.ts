import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';
import type { User } from '@/app/types';

const USER_COLUMNS = 'id, email, full_name, avatar_url, provider, role, created_at, last_sign_in_at';

interface UpsertUserInput {
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  provider: 'email' | 'google';
}

export async function upsertUser({ email, full_name, avatar_url, provider }: UpsertUserInput): Promise<User> {
  const normalizedEmail = email.toLowerCase().trim();

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select(USER_COLUMNS)
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabaseAdmin
      .from('users')
      .update({
        full_name: full_name ?? existing.full_name,
        avatar_url: avatar_url ?? existing.avatar_url,
        last_sign_in_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select(USER_COLUMNS)
      .single();

    if (error || !updated) throw error || new Error('Failed to update user');
    return updated as User;
  }

  const { data: created, error } = await supabaseAdmin
    .from('users')
    .insert({
      email: normalizedEmail,
      full_name: full_name ?? null,
      avatar_url: avatar_url ?? null,
      provider,
      last_sign_in_at: new Date().toISOString(),
    })
    .select(USER_COLUMNS)
    .single();

  if (error || !created) throw error || new Error('Failed to create user');
  return created as User;
}
