import React from "react";
import { getFinanceData } from "@/lib/google-sheets";
import { KeuanganClient } from "./KeuanganClient";

/**
 * ISR: revalidate setiap 300 detik (5 menit), sesuai TTL cache Google Sheets.
 * Requirements: 4.2, 7
 */
export const revalidate = 300;

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata = {
  title: "Keuangan — Portal Warga Bukit Pandawa",
  description:
    "Laporan arus kas keuangan perumahan Bukit Pandawa, Godean Jogja Hills.",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Halaman keuangan portal warga Bukit Pandawa.
 *
 * - Fetch data langsung dari `getFinanceData()` (Server Component + ISR)
 * - Support force refresh via query param `?refresh=true`
 * - Render `SheetSelector` (via KeuanganClient) dan `FinanceTable`
 * - Tampilkan timestamp "terakhir diperbarui"
 * - Tampilkan label "Data mungkin tidak terbaru" jika `from_cache = true`
 * - Tampilkan pesan error deskriptif jika API tidak tersedia
 *
 * Requirements: 4.2, 7
 */
export default async function KeuanganPage({
  searchParams,
}: {
  searchParams: Promise<{ sheet?: string; refresh?: string }>;
}) {
  const { sheet: sheetParam, refresh: refreshParam } = await searchParams;

  // Force refresh jika ada query param ?refresh=true
  const forceRefresh = refreshParam === "true";

  // ── Fetch data ──────────────────────────────────────────────────────────────
  let financeData = null;
  let errorMessage: string | null = null;

  try {
    financeData = await getFinanceData(sheetParam, forceRefresh);
  } catch (err) {
    errorMessage =
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan tidak diketahui saat mengambil data keuangan.";
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (errorMessage) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        {/* Judul halaman */}
        <div>
          <h1 className="text-xl font-bold text-brand-black sm:text-2xl">
            Keuangan
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Laporan arus kas perumahan Bukit Pandawa
          </p>
        </div>

        {/* Error card */}
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-5"
        >
          {/* Ikon + judul */}
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
                className="h-5 w-5 text-red-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </span>
            <p className="text-sm font-semibold text-red-700">
              Data keuangan tidak tersedia
            </p>
          </div>

          {/* Pesan error deskriptif */}
          <p className="text-sm leading-relaxed text-red-600">{errorMessage}</p>

          <p className="text-xs text-red-500">
            Silakan coba muat ulang halaman ini beberapa saat lagi.
          </p>
        </div>
      </div>
    );
  }

  // ── Render normal ───────────────────────────────────────────────────────────
  // financeData pasti tidak null di sini karena error sudah ditangani di atas
  const data = financeData!;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      {/* ── Judul halaman ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-brand-black sm:text-2xl">
          Keuangan
        </h1>
        <p className="text-sm text-gray-500">
          Laporan arus kas perumahan Bukit Pandawa
        </p>
      </div>

      {/* ── Metadata: timestamp + cache label ────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Timestamp terakhir diperbarui */}
        <p className="text-xs text-gray-500">
          Terakhir diperbarui:{" "}
          <time
            dateTime={data.last_updated}
            className="font-medium text-gray-700"
          >
            {new Date(data.last_updated).toLocaleString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jakarta",
            })}{" "}
            WIB
          </time>
        </p>

        {/* Label "Data mungkin tidak terbaru" jika from_cache = true */}
        {data.from_cache && (
          <span
            role="status"
            aria-label="Data ditampilkan dari cache, mungkin tidak terbaru"
            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-3 w-3"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Data mungkin tidak terbaru
          </span>
        )}
      </div>

      {/* ── SheetSelector + FinanceTable (Client Component) ──────────── */}
      <KeuanganClient
        initialData={data}
        initialSheet={sheetParam ?? data.available_sheets[0] ?? ""}
      />
    </div>
  );
}
