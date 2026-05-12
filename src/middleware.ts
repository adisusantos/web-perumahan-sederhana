import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware autentikasi untuk proteksi route `/admin/*`.
 *
 * - Refresh session Supabase via `@supabase/ssr` (baca/tulis cookies)
 * - Redirect ke `/admin` jika tidak ada session aktif
 * - `/admin` itu sendiri (halaman login) dikecualikan dari proteksi
 *
 * Requirements: 3, 9
 */
export async function middleware(request: NextRequest) {
  // Buat response yang bisa dimodifikasi (untuk set cookies session)
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }>
        ) {
          // Set cookies di request (untuk downstream middleware/handlers)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Buat ulang response dengan cookies yang sudah diperbarui
          supabaseResponse = NextResponse.next({
            request,
          });
          // Set cookies di response (untuk browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — PENTING: jangan hapus baris ini.
  // Memanggil getUser() memastikan token di-refresh jika sudah expired.
  // Lihat: https://supabase.com/docs/guides/auth/server-side/nextjs
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Proteksi semua route /admin/* kecuali /admin itu sendiri (halaman login)
  // Pathname yang perlu diproteksi: /admin/dashboard, /admin/pengumuman, dll.
  const isAdminSubRoute =
    pathname.startsWith("/admin/") ||
    (pathname === "/admin" && false); // /admin sendiri = halaman login, tidak diproteksi

  if (isAdminSubRoute && !user) {
    // Tidak ada session aktif — redirect ke halaman login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin";
    loginUrl.search = ""; // Bersihkan query params
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

/**
 * Konfigurasi matcher — middleware hanya berjalan untuk route `/admin/*`.
 * Route statis (_next/static, _next/image, favicon) dikecualikan otomatis
 * oleh Next.js karena tidak cocok dengan pola ini.
 */
export const config = {
  matcher: [
    /*
     * Cocokkan semua path yang dimulai dengan /admin
     * Kecualikan file statis dan API routes yang tidak perlu auth middleware
     */
    "/admin/:path*",
  ],
};
