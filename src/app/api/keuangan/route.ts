/**
 * API Route: GET /api/keuangan
 *
 * Mengambil data keuangan dari Google Sheets via `getFinanceData()`.
 * Mendukung query parameter `?sheet=<sheetName>` untuk memilih sheet.
 *
 * Response 200: FinanceResponse
 * Response 503: FinanceErrorResponse (API error, tidak ada cache)
 */

import { NextRequest, NextResponse } from "next/server";
import { getFinanceData } from "@/lib/google-sheets";

// ─── Response Types ───────────────────────────────────────────────────────────

interface FinanceResponse {
  data: {
    tanggal: string;
    keterangan: string;
    pemasukan: number | null;
    pengeluaran: number | null;
    saldo: number;
  }[];
  last_updated: string;
  from_cache: boolean;
  available_sheets: string[];
}

interface FinanceErrorResponse {
  error: "sheets_unavailable";
  message: string;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest
): Promise<NextResponse<FinanceResponse | FinanceErrorResponse>> {
  // Ambil query parameter ?sheet=<sheetName>
  const { searchParams } = request.nextUrl;
  const sheetName = searchParams.get("sheet") ?? undefined;

  try {
    const financeData = await getFinanceData(sheetName);

    const response: FinanceResponse = {
      data: financeData.rows,
      last_updated: financeData.last_updated,
      from_cache: financeData.from_cache,
      available_sheets: financeData.available_sheets,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    const rawMessage =
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan tidak diketahui saat mengambil data keuangan.";

    // Tentukan pesan yang ramah pengguna berdasarkan jenis error
    let userMessage: string;

    if (
      rawMessage.includes("GOOGLE_SHEETS_ID") ||
      rawMessage.includes("GOOGLE_SHEETS_API_KEY") ||
      rawMessage.includes("Konfigurasi Google Sheets tidak lengkap")
    ) {
      // Konfigurasi environment variable tidak lengkap
      userMessage =
        "Konfigurasi layanan data keuangan tidak lengkap. Silakan hubungi administrator.";
    } else if (
      rawMessage.includes("Format data tidak dikenali") ||
      rawMessage.includes("kolom") ||
      rawMessage.includes("header")
    ) {
      // Format sheet berubah atau kolom tidak ditemukan
      userMessage =
        "Format data tidak dikenali. Pastikan sheet memiliki kolom: Tanggal, Keterangan, Pemasukan, Pengeluaran, Saldo.";
    } else {
      // API error umum (network, quota, dsb.) tanpa cache tersedia
      userMessage = rawMessage;
    }

    const errorResponse: FinanceErrorResponse = {
      error: "sheets_unavailable",
      message: userMessage,
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}
