import type { PollResult } from "@/types";

/**
 * Menghitung hasil poll dari array vote counts per opsi.
 *
 * Setiap elemen `voteCounts[i]` adalah jumlah suara untuk opsi ke-i.
 * Fungsi mengembalikan array PollResult dengan:
 * - `vote_count`: jumlah suara opsi tersebut
 * - `percentage`: persentase suara (0–100, dibulatkan 1 desimal)
 * - `total_votes`: total seluruh suara (sama untuk semua elemen)
 *
 * Catatan: `option_id` dan `label` diisi string kosong karena fungsi ini
 * hanya menerima angka (pure function). Untuk integrasi dengan Supabase,
 * gunakan fungsi terpisah yang menggabungkan hasil ini dengan data PollOption.
 *
 * Edge case: jika total suara = 0, semua percentage = 0.
 *
 * @param voteCounts - Array jumlah suara per opsi
 * @returns Array PollResult dengan vote_count, percentage, dan total_votes
 */
export function calculatePollResults(
  voteCounts: number[]
): (PollResult & { total_votes: number })[] {
  const total = voteCounts.reduce((sum, count) => sum + count, 0);

  return voteCounts.map((count) => {
    const percentage =
      total === 0
        ? 0
        : Math.round((count / total) * 100 * 10) / 10; // bulatkan 1 desimal

    return {
      option_id: "",
      label: "",
      vote_count: count,
      percentage,
      total_votes: total,
    };
  });
}
