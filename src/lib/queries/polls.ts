import { createClient } from "@/lib/supabase/server";
import type { Poll } from "@/types";

/**
 * Mengambil satu poll publik yang sedang aktif untuk ditampilkan
 * sebagai banner di halaman beranda.
 *
 * Kriteria:
 * - type = 'public'
 * - status = 'active'
 * - closes_at IS NULL (tutup manual) ATAU closes_at > NOW() (belum expired)
 *
 * Mengembalikan poll terbaru jika ada lebih dari satu yang aktif.
 * Mengembalikan null jika tidak ada poll aktif.
 *
 * Requirements: 4.1
 */
export async function getActivePoll(): Promise<Poll | null> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("polls")
    .select(
      "id, title, description, type, gang_scope, secret_token, status, closes_at, created_by, created_at"
    )
    .eq("type", "public")
    .eq("status", "active")
    .or(`closes_at.is.null,closes_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getActivePoll] Supabase error:", error.message);
    return null;
  }

  return data as Poll | null;
}
