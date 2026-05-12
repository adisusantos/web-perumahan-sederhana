import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client untuk digunakan di Client Components.
 * Menggunakan anon key — tunduk pada RLS policies.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
