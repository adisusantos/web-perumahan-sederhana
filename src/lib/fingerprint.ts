/**
 * Browser fingerprint dan hashing untuk anti double-vote
 * Portal Warga Bukit Pandawa
 *
 * Catatan: Fingerprint ini adalah best-effort deterrent, bukan jaminan mutlak.
 * Tidak ada data identitas yang disimpan — hanya hash SHA-256 dari atribut browser.
 */

/**
 * Kumpulkan atribut browser untuk membentuk fingerprint string.
 *
 * Atribut yang dikumpulkan:
 * - User agent
 * - Bahasa browser
 * - Timezone
 * - Resolusi layar
 * - Kedalaman warna
 * - Jumlah CPU logical
 * - Platform
 *
 * @returns String fingerprint dari atribut browser yang digabungkan
 */
export function generateFingerprint(): string {
  const components: string[] = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screen.width}x${screen.height}`,
    String(screen.colorDepth),
    String(navigator.hardwareConcurrency ?? ""),
    navigator.platform,
  ];

  return components.join("|");
}

/**
 * Hash string fingerprint menggunakan SHA-256 via Web Crypto API.
 *
 * Output: 64 karakter hexadecimal lowercase (deterministik).
 * Fungsi ini async karena Web Crypto API bersifat async.
 *
 * @param input - String yang akan di-hash (biasanya hasil generateFingerprint())
 * @returns Promise yang resolve ke string hex SHA-256 64 karakter lowercase
 */
export async function hashFingerprint(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Konversi ArrayBuffer ke hex string lowercase
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexString = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hexString;
}
