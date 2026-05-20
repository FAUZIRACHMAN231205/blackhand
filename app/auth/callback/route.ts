import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    try {
      // The code is handled by Supabase automatically via the session cookie
      // Just redirect to dashboard after auth
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    } catch (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(new URL('/auth/error', requestUrl.origin))
    }
  }

  // If no code, redirect to home
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}