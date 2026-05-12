/**
 * Tests untuk Google Sheets API wrapper.
 *
 * Mencakup:
 * - Unit tests untuk parseNumericCell dan parseSheetValues
 * - Unit tests untuk getFinanceData (cache, retry, fallback)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseNumericCell,
  parseSheetValues,
  getFinanceData,
  clearFinanceCache,
} from "./google-sheets";

// ─── parseNumericCell ─────────────────────────────────────────────────────────

describe("parseNumericCell", () => {
  it("mengembalikan null untuk string kosong", () => {
    expect(parseNumericCell("")).toBeNull();
  });

  it("mengembalikan null untuk tanda strip", () => {
    expect(parseNumericCell("-")).toBeNull();
  });

  it("mengembalikan null untuk string yang bukan angka", () => {
    expect(parseNumericCell("abc")).toBeNull();
  });

  it("mem-parse angka bulat biasa", () => {
    expect(parseNumericCell("1000")).toBe(1000);
  });

  it("mem-parse angka dengan pemisah ribuan titik (format Indonesia)", () => {
    expect(parseNumericCell("1.000.000")).toBe(1000000);
  });

  it("mem-parse angka dengan koma desimal (format Indonesia)", () => {
    expect(parseNumericCell("1.500,50")).toBe(1500.5);
  });

  it("mem-parse angka negatif", () => {
    expect(parseNumericCell("-500")).toBe(-500);
  });

  it("mem-parse angka nol", () => {
    expect(parseNumericCell("0")).toBe(0);
  });

  it("mengabaikan whitespace di sekitar angka", () => {
    expect(parseNumericCell("  2500  ")).toBe(2500);
  });
});

// ─── parseSheetValues ─────────────────────────────────────────────────────────

describe("parseSheetValues", () => {
  it("mengembalikan array kosong untuk input kosong", () => {
    expect(parseSheetValues([])).toEqual([]);
  });

  it("mengembalikan array kosong jika hanya ada header tanpa data", () => {
    const values = [["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"]];
    expect(parseSheetValues(values)).toEqual([]);
  });

  it("mem-parse baris data dengan benar", () => {
    const values = [
      ["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"],
      ["2024-01-01", "Iuran warga", "500000", "", "500000"],
    ];
    const result = parseSheetValues(values);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      tanggal: "2024-01-01",
      keterangan: "Iuran warga",
      pemasukan: 500000,
      pengeluaran: null,
      saldo: 500000,
    });
  });

  it("mem-parse beberapa baris data", () => {
    const values = [
      ["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"],
      ["2024-01-01", "Iuran warga", "500000", "", "500000"],
      ["2024-01-05", "Beli cat", "", "150000", "350000"],
    ];
    const result = parseSheetValues(values);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      tanggal: "2024-01-05",
      keterangan: "Beli cat",
      pemasukan: null,
      pengeluaran: 150000,
      saldo: 350000,
    });
  });

  it("melewati baris yang tanggal dan keterangan kosong", () => {
    const values = [
      ["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"],
      ["", "", "", "", ""],
      ["2024-01-01", "Iuran", "500000", "", "500000"],
    ];
    const result = parseSheetValues(values);
    expect(result).toHaveLength(1);
  });

  it("melewati baris yang saldo tidak valid", () => {
    const values = [
      ["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"],
      ["2024-01-01", "Iuran", "500000", "", ""],
    ];
    const result = parseSheetValues(values);
    expect(result).toHaveLength(0);
  });

  it("header case-insensitive", () => {
    const values = [
      ["TANGGAL", "KETERANGAN", "PEMASUKAN", "PENGELUARAN", "SALDO"],
      ["2024-01-01", "Test", "100000", "", "100000"],
    ];
    const result = parseSheetValues(values);
    expect(result).toHaveLength(1);
    expect(result[0].tanggal).toBe("2024-01-01");
  });

  it("melempar error jika kolom wajib tidak ada di header", () => {
    const values = [
      ["Tanggal", "Keterangan", "Pemasukan"],
      ["2024-01-01", "Test", "100000"],
    ];
    expect(() => parseSheetValues(values)).toThrow(
      "Format data tidak dikenali"
    );
  });

  it("melempar error jika header kosong", () => {
    const values = [[]];
    expect(() => parseSheetValues(values)).toThrow(
      "Format data tidak dikenali"
    );
  });

  it("menjaga urutan baris", () => {
    const values = [
      ["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"],
      ["2024-01-01", "Pertama", "100000", "", "100000"],
      ["2024-01-02", "Kedua", "200000", "", "300000"],
      ["2024-01-03", "Ketiga", "", "50000", "250000"],
    ];
    const result = parseSheetValues(values);
    expect(result).toHaveLength(3);
    expect(result[0].keterangan).toBe("Pertama");
    expect(result[1].keterangan).toBe("Kedua");
    expect(result[2].keterangan).toBe("Ketiga");
  });
});

// ─── getFinanceData ───────────────────────────────────────────────────────────

describe("getFinanceData", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset cache sebelum setiap test
    clearFinanceCache();
    // Set environment variables
    process.env = {
      ...originalEnv,
      GOOGLE_SHEETS_ID: "test-sheet-id",
      GOOGLE_SHEETS_API_KEY: "test-api-key",
    };
    // Reset semua mock
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("melempar error jika env vars tidak diset", async () => {
    delete process.env.GOOGLE_SHEETS_ID;
    delete process.env.GOOGLE_SHEETS_API_KEY;

    await expect(getFinanceData()).rejects.toThrow(
      "Konfigurasi Google Sheets tidak lengkap"
    );
  });

  it("mengembalikan data dari API saat fetch berhasil", async () => {
    const mockMetaResponse = {
      sheets: [{ properties: { title: "Januari 2024" } }],
    };
    const mockDataResponse = {
      values: [
        ["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"],
        ["2024-01-01", "Iuran warga", "500000", "", "500000"],
      ],
    };

    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockMetaResponse), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDataResponse), { status: 200 })
      );

    const result = await getFinanceData();

    expect(result.from_cache).toBe(false);
    expect(result.rows).toHaveLength(1);
    expect(result.available_sheets).toEqual(["Januari 2024"]);
    expect(result.rows[0].tanggal).toBe("2024-01-01");
  });

  it("mengembalikan cache valid tanpa memanggil API lagi", async () => {
    const mockMetaResponse = {
      sheets: [{ properties: { title: "Sheet1" } }],
    };
    const mockDataResponse = {
      values: [
        ["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"],
        ["2024-01-01", "Test", "100000", "", "100000"],
      ],
    };

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockMetaResponse), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDataResponse), { status: 200 })
      );

    // Panggil pertama kali — fetch dari API
    await getFinanceData();
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Panggil kedua kali — harus dari cache, tidak ada fetch tambahan
    const cached = await getFinanceData();
    expect(fetchSpy).toHaveBeenCalledTimes(2); // tidak bertambah
    expect(cached.from_cache).toBe(false); // cache valid, bukan stale
  });

  it("fallback ke cache stale dengan from_cache=true saat API error", async () => {
    const mockMetaResponse = {
      sheets: [{ properties: { title: "Sheet1" } }],
    };
    const mockDataResponse = {
      values: [
        ["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"],
        ["2024-01-01", "Test", "100000", "", "100000"],
      ],
    };

    // Fetch pertama berhasil — isi cache
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockMetaResponse), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDataResponse), { status: 200 })
      );

    await getFinanceData();

    // Hapus cache valid tapi biarkan stale cache ada dengan cara mock Date.now
    // Simulasikan cache expired dengan mengubah waktu
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 400 * 1000); // +400 detik

    // Fetch berikutnya gagal
    vi.spyOn(global, "fetch").mockRejectedValue(
      new Error("Network error")
    );

    const result = await getFinanceData();
    expect(result.from_cache).toBe(true);
    expect(result.rows).toHaveLength(1);
  });

  it("melempar error deskriptif jika API error dan tidak ada cache", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(
      new Error("Network error: connection refused")
    );

    await expect(getFinanceData()).rejects.toThrow(
      "Data keuangan tidak tersedia"
    );
  });

  it("retry 1x saat timeout lalu berhasil", async () => {
    const mockMetaResponse = {
      sheets: [{ properties: { title: "Sheet1" } }],
    };
    const mockDataResponse = {
      values: [
        ["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"],
        ["2024-01-01", "Test", "100000", "", "100000"],
      ],
    };

    const timeoutError = new Error("timeout: Request ke Google Sheets API melebihi 10000ms");

    vi.spyOn(global, "fetch")
      // Attempt 1: timeout pada meta request
      .mockRejectedValueOnce(timeoutError)
      // Attempt 2: berhasil
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockMetaResponse), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDataResponse), { status: 200 })
      );

    const result = await getFinanceData();
    expect(result.from_cache).toBe(false);
    expect(result.rows).toHaveLength(1);
  });

  it("retry 1x saat timeout lalu fallback ke cache jika retry juga gagal", async () => {
    const mockMetaResponse = {
      sheets: [{ properties: { title: "Sheet1" } }],
    };
    const mockDataResponse = {
      values: [
        ["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"],
        ["2024-01-01", "Test", "100000", "", "100000"],
      ],
    };

    // Isi cache dulu
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockMetaResponse), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDataResponse), { status: 200 })
      );
    await getFinanceData();

    // Expire cache
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 400 * 1000);

    const timeoutError = new Error("timeout: Request ke Google Sheets API melebihi 10000ms");

    // Kedua attempt timeout
    vi.spyOn(global, "fetch")
      .mockRejectedValueOnce(timeoutError)
      .mockRejectedValueOnce(timeoutError);

    const result = await getFinanceData();
    expect(result.from_cache).toBe(true);
  });

  it("mengembalikan available_sheets dari metadata", async () => {
    const mockMetaResponse = {
      sheets: [
        { properties: { title: "Januari 2024" } },
        { properties: { title: "Februari 2024" } },
        { properties: { title: "Maret 2024" } },
      ],
    };
    const mockDataResponse = {
      values: [
        ["Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"],
      ],
    };

    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockMetaResponse), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockDataResponse), { status: 200 })
      );

    const result = await getFinanceData();
    expect(result.available_sheets).toEqual([
      "Januari 2024",
      "Februari 2024",
      "Maret 2024",
    ]);
  });

  it("melempar error deskriptif saat API mengembalikan status 403", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("Forbidden", { status: 403, statusText: "Forbidden" })
    );

    await expect(getFinanceData()).rejects.toThrow(
      "Data keuangan tidak tersedia"
    );
  });
});
