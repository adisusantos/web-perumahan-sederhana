import { createClient } from "@/lib/supabase/server";
import type { Announcement } from "@/types/index";

/**
 * Mengambil maksimal 5 pengumuman terbaru dari Supabase,
 * diurutkan dari yang terbaru (created_at DESC).
 *
 * Digunakan di halaman beranda dengan ISR revalidate: 60 detik.
 * Requirements: 4.1
 */
export async function getLatestAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, priority, created_by, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("[getLatestAnnouncements] Supabase error:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Konfigurasi ISR untuk halaman yang menggunakan query ini.
 * Ekspor konstanta ini dan gunakan sebagai `export const revalidate`
 * di page.tsx yang memanggil `getLatestAnnouncements`.
 */
export const ANNOUNCEMENTS_REVALIDATE = 60;
