// Middleware ini sengaja dibuat pass-through.
//
// Alasan: Supabase browser client (@supabase/supabase-js) menyimpan session
// di localStorage, BUKAN di cookies. Sehingga middleware Next.js tidak bisa
// membaca status login dari sini.
//
// Proteksi route /admin sudah ditangani di sisi client oleh:
//   - app/admin/page.tsx          → cek isAdmin(user.email)
//   - app/admin/works/page.tsx    → cek isAdmin(user.email)
//   - app/admin/works/create/...  → cek isAdmin(user.email)
//
// Untuk menambahkan proteksi server-side di masa depan,
// install @supabase/ssr dan ikuti panduan resminya.

import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

// Tidak ada matcher — middleware tidak aktif untuk route manapun.
export const config = {
  matcher: [],
};
