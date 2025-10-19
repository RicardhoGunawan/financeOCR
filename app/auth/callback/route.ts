// auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Ambil URL permintaan dan parse 'code' serta 'next'
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'; // Default redirect ke /dashboard

  console.log('🔍 Callback triggered');
  console.log('📝 Code:', code ? 'exists' : 'missing');
  console.log('📍 Origin:', requestUrl.origin);

  // Pastikan 'code' ada di URL
  if (code) {
    // 1. Ambil cookie store. Ini HARUS di 'await'
    const cookieStore = await cookies();

    // 2. Buat Supabase client khusus untuk Route Handler
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    });

    console.log('🔄 Exchanging code for session...');
    // 3. Tukarkan 'code' (dari Google) dengan session Supabase
    //    Client ini secara otomatis akan membaca code_verifier dari cookie
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Jika terjadi error saat penukaran code
      console.error('❌ Error exchanging code:', error);
      // Redirect kembali ke halaman auth dengan pesan error
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=auth_failed`);
    }

    if (data.session) {
      // Jika session berhasil dibuat
      console.log('✅ Session created successfully');
      console.log('👤 User:', data.session.user.email);
      // Redirect pengguna ke halaman tujuan ('/dashboard' atau 'next' URL)
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    }
  }

  // Jika 'code' tidak ditemukan di URL
  console.log('⚠️ No code or session found in callback');
  return NextResponse.redirect(`${requestUrl.origin}/auth?error=no_code`);
}