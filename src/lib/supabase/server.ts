import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server client untuk digunakan di Server Components, Route Handlers,
 * dan Server Actions. Membaca/menulis cookies via `next/headers`.
 * Menggunakan anon key — tunduk pada RLS policies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll dipanggil dari Server Component — cookies tidak bisa
            // di-set di sini, tapi session tetap bisa dibaca.
          }
        },
      },
    }
  );
}
