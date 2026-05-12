/**
 * Utilitas umum untuk Portal Warga Bukit Pandawa
 */

// Karakter alfanumerik URL-safe (A-Z, a-z, 0-9)
const ALPHANUMERIC_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generate secret token 12 karakter alfanumerik URL-safe menggunakan CSPRNG.
 *
 * Menggunakan `crypto.getRandomValues` untuk memastikan token tidak bisa ditebak.
 * Digunakan untuk secret link poll per gang.
 *
 * @returns Token 12 karakter alfanumerik (A-Z, a-z, 0-9)
 */
export function generateSecretToken(): string {
  const tokenLength = 12;
  const charsetLength = ALPHANUMERIC_CHARS.length; // 62

  // Gunakan rejection sampling untuk menghindari modulo bias.
  // 256 / 62 = 4 remainder 8, jadi kita tolak nilai >= 248 (4 * 62 = 248)
  const maxUnbiased = Math.floor(256 / charsetLength) * charsetLength; // 248

  const result: string[] = [];

  while (result.length < tokenLength) {
    // Ambil byte random dalam jumlah yang cukup sekaligus untuk efisiensi
    const randomBytes = new Uint8Array(tokenLength * 2);
    crypto.getRandomValues(randomBytes);

    for (const byte of randomBytes) {
      if (result.length >= tokenLength) break;
      // Rejection sampling: tolak byte yang menyebabkan modulo bias
      if (byte < maxUnbiased) {
        result.push(ALPHANUMERIC_CHARS[byte % charsetLength]);
      }
    }
  }

  return result.join("");
}
