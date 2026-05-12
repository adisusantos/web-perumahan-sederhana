/**
 * Google Sheets API v4 wrapper untuk data keuangan Portal Warga Bukit Pandawa.
 *
 * Fitur:
 * - Fetch data dari Google Sheets API v4 (read-only)
 * - In-memory cache server-side dengan TTL 5 menit
 * - Retry 1x saat network timeout
 * - Fallback ke cache dengan flag `from_cache: true` saat API error
 * - Parsing baris header + data ke array FinanceRow
 * - Error deskriptif jika tidak ada cache dan API error
 */

import type { FinanceData, FinanceRow } from "@/types";

// ─── Konstanta ───────────────────────────────────────────────────────────────

/** TTL cache dalam milidetik (5 menit = 300 detik) */
const CACHE_TTL_MS = 300 * 1000;

/** Timeout per request ke Google Sheets API (10 detik) */
const REQUEST_TIMEOUT_MS = 10_000;

/** Nama kolom yang diharapkan di baris header sheet */
const EXPECTED_HEADERS = [
  "tanggal",
  "keterangan",
  "pemasukan",
  "pengeluaran",
  "saldo",
] as const;

// ─── In-memory cache ─────────────────────────────────────────────────────────

interface CacheEntry {
  data: FinanceData;
  /** Timestamp Unix (ms) saat cache disimpan */
  cachedAt: number;
}

/**
 * Cache per sheet name. Key = sheetName (atau "__default__" jika tidak ada).
 * Cache ini hidup selama proses Node.js berjalan (server-side only).
 */
const cache = new Map<string, CacheEntry>();

/** Kunci cache untuk sheet tanpa nama eksplisit */
const DEFAULT_CACHE_KEY = "__default__";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Ambil entry cache yang masih valid (belum expired).
 * Mengembalikan `null` jika tidak ada atau sudah expired.
 * Entry yang expired TIDAK dihapus agar bisa digunakan sebagai stale fallback.
 */
function getValidCache(cacheKey: string): FinanceData | null {
  const entry = cache.get(cacheKey);
  if (!entry) return null;

  const age = Date.now() - entry.cachedAt;
  if (age > CACHE_TTL_MS) {
    return null;
  }

  return entry.data;
}

/**
 * Ambil entry cache meskipun sudah expired (untuk fallback saat API error).
 * Mengembalikan `null` jika tidak ada sama sekali.
 */
function getStaleCache(cacheKey: string): FinanceData | null {
  const entry = cache.get(cacheKey);
  return entry ? entry.data : null;
}

/**
 * Simpan data ke cache.
 */
function setCache(cacheKey: string, data: FinanceData): void {
  cache.set(cacheKey, { data, cachedAt: Date.now() });
}

/**
 * Parse nilai numerik dari string Google Sheets.
 * Mengembalikan `null` jika string kosong atau bukan angka valid.
 */
export function parseNumericCell(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-") return null;

  // Hapus pemisah ribuan (titik) dan ganti koma desimal ke titik
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);

  return isNaN(value) ? null : value;
}

/**
 * Parse baris header + data dari respons Google Sheets API ke array FinanceRow.
 *
 * Format yang diharapkan:
 * - `values[0]` = baris header (Tanggal, Keterangan, Pemasukan, Pengeluaran, Saldo)
 * - `values[1..]` = baris data
 *
 * @throws Error jika format header tidak dikenali
 */
export function parseSheetValues(values: string[][]): FinanceRow[] {
  if (!values || values.length === 0) {
    return [];
  }

  const headerRow = values[0];
  if (!headerRow || headerRow.length === 0) {
    throw new Error(
      "Format data tidak dikenali: baris header kosong atau tidak ada."
    );
  }

  // Normalisasi header ke lowercase untuk perbandingan case-insensitive
  const normalizedHeaders = headerRow.map((h) => h.trim().toLowerCase());

  // Cari indeks setiap kolom yang diharapkan
  const colIndex: Record<(typeof EXPECTED_HEADERS)[number], number> = {
    tanggal: normalizedHeaders.indexOf("tanggal"),
    keterangan: normalizedHeaders.indexOf("keterangan"),
    pemasukan: normalizedHeaders.indexOf("pemasukan"),
    pengeluaran: normalizedHeaders.indexOf("pengeluaran"),
    saldo: normalizedHeaders.indexOf("saldo"),
  };

  // Validasi semua kolom wajib ada
  for (const col of EXPECTED_HEADERS) {
    if (colIndex[col] === -1) {
      throw new Error(
        `Format data tidak dikenali: kolom "${col}" tidak ditemukan di header. ` +
          `Header yang ditemukan: ${headerRow.join(", ")}`
      );
    }
  }

  const rows: FinanceRow[] = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length === 0) continue;

    // Ambil nilai setiap sel, default ke string kosong jika kolom tidak ada
    const getCell = (idx: number): string => row[idx] ?? "";

    const tanggal = getCell(colIndex.tanggal).trim();
    const keterangan = getCell(colIndex.keterangan).trim();
    const saldoRaw = getCell(colIndex.saldo);
    const saldoParsed = parseNumericCell(saldoRaw);

    // Lewati baris yang benar-benar kosong (tanggal dan keterangan kosong)
    if (tanggal === "" && keterangan === "") continue;

    // Saldo wajib ada (tidak boleh null)
    if (saldoParsed === null) continue;

    rows.push({
      tanggal,
      keterangan,
      pemasukan: parseNumericCell(getCell(colIndex.pemasukan)),
      pengeluaran: parseNumericCell(getCell(colIndex.pengeluaran)),
      saldo: saldoParsed,
    });
  }

  return rows;
}

/**
 * Fetch data dari satu sheet Google Sheets API v4.
 * Mengembalikan `{ values, availableSheets }`.
 *
 * @throws Error jika request gagal atau respons tidak valid
 */
async function fetchSheetData(
  sheetsId: string,
  apiKey: string,
  sheetName?: string
): Promise<{ values: string[][]; availableSheets: string[] }> {
  // Ambil metadata spreadsheet untuk mendapatkan daftar sheet
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetsId)}?key=${encodeURIComponent(apiKey)}`;

  const metaResponse = await fetchWithTimeout(metaUrl, REQUEST_TIMEOUT_MS);

  if (!metaResponse.ok) {
    throw new Error(
      `Google Sheets API error ${metaResponse.status}: ${metaResponse.statusText}`
    );
  }

  const metaJson = await metaResponse.json();
  const sheets: Array<{ properties: { title: string } }> =
    metaJson?.sheets ?? [];
  const availableSheets = sheets.map((s) => s.properties.title);

  // Tentukan sheet yang akan diambil
  const targetSheet =
    sheetName ?? (availableSheets.length > 0 ? availableSheets[0] : undefined);

  if (!targetSheet) {
    throw new Error("Spreadsheet tidak memiliki sheet yang bisa dibaca.");
  }

  // Fetch data dari sheet yang dipilih
  const range = encodeURIComponent(`${targetSheet}!A:E`);
  const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetsId)}/values/${range}?key=${encodeURIComponent(apiKey)}`;

  const dataResponse = await fetchWithTimeout(dataUrl, REQUEST_TIMEOUT_MS);

  if (!dataResponse.ok) {
    throw new Error(
      `Google Sheets API error ${dataResponse.status}: ${dataResponse.statusText}`
    );
  }

  const dataJson = await dataResponse.json();
  const values: string[][] = dataJson?.values ?? [];

  return { values, availableSheets };
}

/**
 * Fetch dengan timeout. Melempar `Error` dengan pesan "timeout" jika melebihi batas.
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`timeout: Request ke Google Sheets API melebihi ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cek apakah error adalah network timeout.
 */
function isTimeoutError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.startsWith("timeout:") || err.name === "AbortError")
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Ambil data keuangan dari Google Sheets.
 *
 * Urutan prioritas:
 * 1. Cache valid (belum expired) → kembalikan langsung
 * 2. Fetch dari API → simpan ke cache → kembalikan
 * 3. Jika timeout → retry 1x
 * 4. Jika API error → fallback ke cache stale dengan `from_cache: true`
 * 5. Jika tidak ada cache sama sekali → lempar error deskriptif
 *
 * @param sheetName - Nama sheet yang ingin diambil. Jika tidak diisi, gunakan sheet pertama.
 * @param forceRefresh - Jika true, bypass cache dan fetch langsung dari API
 * @returns FinanceData dengan rows, last_updated, from_cache, available_sheets
 * @throws Error jika API error dan tidak ada cache
 */
export async function getFinanceData(
  sheetName?: string,
  forceRefresh = false
): Promise<FinanceData> {
  const sheetsId = process.env.GOOGLE_SHEETS_ID;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  if (!sheetsId || !apiKey) {
    throw new Error(
      "Konfigurasi Google Sheets tidak lengkap: GOOGLE_SHEETS_ID dan GOOGLE_SHEETS_API_KEY harus diset."
    );
  }

  const cacheKey = sheetName ?? DEFAULT_CACHE_KEY;

  // 1. Cek cache valid (skip jika forceRefresh)
  if (!forceRefresh) {
    const validCached = getValidCache(cacheKey);
    if (validCached) {
      return validCached;
    }
  }

  // 2. Coba fetch dari API (dengan retry 1x saat timeout)
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { values, availableSheets } = await fetchSheetData(
        sheetsId,
        apiKey,
        sheetName
      );

      const rows = parseSheetValues(values);
      const now = new Date().toISOString();

      const data: FinanceData = {
        rows,
        last_updated: now,
        from_cache: false,
        available_sheets: availableSheets,
      };

      // Simpan ke cache
      setCache(cacheKey, data);

      return data;
    } catch (err) {
      lastError = err;

      // Hanya retry saat timeout, dan hanya pada attempt pertama
      if (attempt === 1 && isTimeoutError(err)) {
        // Lanjut ke attempt ke-2
        continue;
      }

      // Error bukan timeout, atau sudah attempt ke-2 → keluar dari loop
      break;
    }
  }

  // 3. API gagal — coba fallback ke cache stale
  const staleData = getStaleCache(cacheKey);
  if (staleData) {
    return {
      ...staleData,
      from_cache: true,
    };
  }

  // 4. Tidak ada cache sama sekali → lempar error deskriptif
  const errorMessage =
    lastError instanceof Error
      ? lastError.message
      : "Terjadi kesalahan tidak diketahui saat mengambil data keuangan.";

  throw new Error(
    `Data keuangan tidak tersedia: ${errorMessage}. ` +
      "Tidak ada data cache yang bisa ditampilkan. Silakan coba lagi nanti."
  );
}

/**
 * Hapus semua cache (berguna untuk testing).
 */
export function clearFinanceCache(): void {
  cache.clear();
}
