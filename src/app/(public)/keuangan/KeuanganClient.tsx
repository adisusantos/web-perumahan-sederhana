"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SheetSelector } from "@/components/finance/SheetSelector";
import { FinanceTable } from "@/components/finance/FinanceTable";
import { Button } from "@/components/ui/Button";
import type { FinanceData } from "@/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface KeuanganClientProps {
  /** Data keuangan awal yang di-fetch oleh Server Component */
  initialData: FinanceData;
  /** Sheet yang sedang aktif (dari URL param atau default) */
  initialSheet: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Client Component untuk halaman keuangan.
 *
 * Mengelola interaktivitas pemilihan sheet dan refresh manual:
 * - Saat pengguna memilih sheet lain, update URL query param `?sheet=...`
 * - Next.js ISR akan menyajikan data sheet yang sesuai
 * - Tombol refresh untuk force revalidate dan ambil data terbaru
 * - Menampilkan loading state saat navigasi berlangsung
 *
 * Requirements: 4.2, 9 (mobile-first)
 */
export function KeuanganClient({ initialData, initialSheet }: KeuanganClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [activeSheet, setActiveSheet] = useState(initialSheet);

  /**
   * Saat pengguna memilih sheet baru:
   * - Update state lokal untuk UI responsif
   * - Navigate ke URL baru dengan query param `?sheet=<nama>`
   *   agar Server Component fetch data sheet yang dipilih
   */
  function handleSheetChange(sheet: string) {
    setActiveSheet(sheet);
    startTransition(() => {
      const params = new URLSearchParams();
      params.set("sheet", sheet);
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  /**
   * Force refresh data dari Google Sheets dengan memanggil router.refresh()
   * yang akan trigger Server Component untuk re-fetch dengan forceRefresh=true.
   */
  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      // Update URL dengan query param refresh=true untuk force bypass cache
      const params = new URLSearchParams();
      params.set("sheet", activeSheet);
      params.set("refresh", "true");
      
      // Navigate dengan query param baru
      await router.push(`${pathname}?${params.toString()}`);
      
      // Tunggu sebentar untuk memberi feedback visual
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Hapus query param refresh dari URL setelah refresh selesai
      const cleanParams = new URLSearchParams();
      cleanParams.set("sheet", activeSheet);
      router.replace(`${pathname}?${cleanParams.toString()}`, { scroll: false });
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Sheet Selector + Refresh Button ───────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Sheet Selector */}
        {initialData.available_sheets.length > 0 && (
          <SheetSelector
            sheets={initialData.available_sheets}
            activeSheet={activeSheet}
            onSheetChange={handleSheetChange}
            disabled={isPending || isRefreshing}
          />
        )}

        {/* Refresh Button */}
        <Button
          onClick={handleRefresh}
          disabled={isPending || isRefreshing}
          variant="outline"
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={[
              "h-4 w-4",
              isRefreshing ? "animate-spin" : "",
            ].join(" ")}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          {isRefreshing ? "Memuat ulang..." : "Muat Ulang"}
        </Button>
      </div>

      {/* ── Loading overlay saat navigasi ─────────────────────────────── */}
      <div
        className={[
          "transition-opacity duration-200",
          isPending || isRefreshing ? "opacity-50 pointer-events-none" : "opacity-100",
        ].join(" ")}
        aria-busy={isPending || isRefreshing}
        aria-live="polite"
      >
        {isPending && (
          <p className="sr-only">Memuat data sheet {activeSheet}…</p>
        )}
        {isRefreshing && (
          <p className="sr-only">Memuat ulang data dari Google Sheets…</p>
        )}
        <FinanceTable rows={initialData.rows} />
      </div>
    </div>
  );
}
