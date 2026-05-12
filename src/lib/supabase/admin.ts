import { createClient } from "@supabase/supabase-js";

/**
 * Service role client untuk operasi admin yang membutuhkan bypass RLS.
 * HANYA digunakan di server-side (Route Handlers, Server Actions).
 * JANGAN pernah expose client ini ke browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        // Nonaktifkan auto-refresh token — tidak diperlukan untuk service role
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
