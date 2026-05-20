import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Tambahkan proteksi ini untuk mempermudah kamu melacak jika env fail dimuat
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Kunci Supabase hilang! Periksa kembali file .env.local Anda.")
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)