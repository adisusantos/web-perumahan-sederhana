import React from "react";
import type { FinanceRow } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format angka ke format Rupiah tanpa simbol "Rp" (hanya angka dengan titik).
 * Contoh: 1500000 → "1.500.000"
 */
function formatRupiah(value: number | null): string {
  if (value === null || value === 0) return "—";
  return value.toLocaleString("id-ID");
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FinanceTableProps {
  /** Array baris data keuangan dari Google Sheets */
  rows: FinanceRow[];
  /** Class tambahan untuk container terluar */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Tabel arus kas keuangan perumahan Bukit Pandawa.
 *
 * - Scroll horizontal di mobile (Requirement 9)
 * - Data terbaru ditampilkan di atas (urutan descending)
 * - Accessible: menggunakan `<table>` semantik dengan `<caption>` dan `scope`
 * - Mobile-first: kolom keterangan fleksibel, kolom angka lebar tetap
 */
export function FinanceTable({ rows, className = "" }: FinanceTableProps) {
  if (rows.length === 0) {
    return (
      <div
        role="status"
        className={[
          "flex items-center justify-center rounded-xl border border-dashed border-gray-200",
          "bg-gray-50 px-6 py-12 text-center text-sm text-gray-500",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        Tidak ada data keuangan untuk periode ini.
      </div>
    );
  }

  return (
    /* Wrapper: overflow-x-auto agar tabel bisa di-scroll horizontal di mobile */
    <div
      className={[
        "w-full overflow-x-auto rounded-xl border border-gray-200 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="region"
      aria-label="Tabel arus kas keuangan"
    >
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <caption className="sr-only">
          Tabel arus kas keuangan perumahan Bukit Pandawa
        </caption>

        {/* ── Header ── */}
        <thead className="bg-brand-green text-white">
          <tr>
            <th
              scope="col"
              className="whitespace-nowrap px-4 py-3 text-left font-semibold"
            >
              Tanggal
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-semibold"
            >
              Keterangan
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-4 py-3 text-right font-semibold"
            >
              Pemasukan (Rp)
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-4 py-3 text-right font-semibold"
            >
              Pengeluaran (Rp)
            </th>
            <th
              scope="col"
              className="whitespace-nowrap px-4 py-3 text-right font-semibold"
            >
              Saldo (Rp)
            </th>
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row, index) => (
            <tr
              key={index}
              className="transition-colors hover:bg-gray-50"
            >
              {/* Tanggal */}
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                {row.tanggal || "—"}
              </td>

              {/* Keterangan — bisa wrap di layar lebar */}
              <td className="px-4 py-3 text-brand-black">
                {row.keterangan || "—"}
              </td>

              {/* Pemasukan — hijau jika ada nilai */}
              <td
                className={[
                  "whitespace-nowrap px-4 py-3 text-right tabular-nums",
                  row.pemasukan ? "font-medium text-green-700" : "text-gray-400",
                ].join(" ")}
              >
                {formatRupiah(row.pemasukan)}
              </td>

              {/* Pengeluaran — merah jika ada nilai */}
              <td
                className={[
                  "whitespace-nowrap px-4 py-3 text-right tabular-nums",
                  row.pengeluaran
                    ? "font-medium text-red-600"
                    : "text-gray-400",
                ].join(" ")}
              >
                {formatRupiah(row.pengeluaran)}
              </td>

              {/* Saldo */}
              <td
                className={[
                  "whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums",
                  row.saldo >= 0 ? "text-brand-black" : "text-red-600",
                ].join(" ")}
              >
                {row.saldo.toLocaleString("id-ID")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FinanceTable;
