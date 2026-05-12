"use client";

import React from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SheetSelectorProps {
  /** Daftar nama sheet yang tersedia (dari `FinanceData.available_sheets`) */
  sheets: string[];
  /** Nama sheet yang sedang aktif */
  activeSheet: string;
  /** Callback saat pengguna memilih sheet lain */
  onSheetChange: (sheet: string) => void;
  /** Class tambahan untuk container */
  className?: string;
  /** Nonaktifkan selector saat sedang loading */
  disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Komponen pemilih sheet keuangan.
 *
 * - Di mobile: tampil sebagai `<select>` dropdown (lebih mudah dioperasikan)
 * - Di desktop (sm ke atas): tampil sebagai tab horizontal
 * - Accessible: label eksplisit, keyboard navigable
 * - Mobile-first (Requirement 9), mendukung Requirement 4.2
 */
export function SheetSelector({
  sheets,
  activeSheet,
  onSheetChange,
  className = "",
  disabled = false,
}: SheetSelectorProps) {
  // Tidak ada sheet — tidak render apa-apa
  if (sheets.length === 0) return null;

  // Hanya satu sheet — tidak perlu selector
  if (sheets.length === 1) {
    return (
      <div
        className={[
          "inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-2",
          "text-sm font-medium text-brand-black",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Sheet aktif"
      >
        {sheets[0]}
      </div>
    );
  }

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")}>
      {/* ── Mobile: Dropdown select ── */}
      {/* Ditampilkan di semua ukuran layar kecil (default), disembunyikan di sm+ */}
      <div className="sm:hidden">
        <label
          htmlFor="sheet-select"
          className="mb-1.5 block text-xs font-medium text-gray-500"
        >
          Pilih periode
        </label>
        <select
          id="sheet-select"
          value={activeSheet}
          onChange={(e) => onSheetChange(e.target.value)}
          disabled={disabled}
          className={[
            "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5",
            "text-sm text-brand-black shadow-sm",
            "focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Touch target minimal 44px
            "min-h-[44px]",
          ].join(" ")}
          aria-label="Pilih sheet keuangan"
        >
          {sheets.map((sheet) => (
            <option key={sheet} value={sheet}>
              {sheet}
            </option>
          ))}
        </select>
      </div>

      {/* ── Desktop: Tab horizontal ── */}
      {/* Disembunyikan di mobile, ditampilkan di sm+ */}
      <div
        className="hidden sm:block"
        role="tablist"
        aria-label="Pilih periode keuangan"
      >
        <div className="flex flex-wrap gap-2">
          {sheets.map((sheet) => {
            const isActive = sheet === activeSheet;
            return (
              <button
                key={sheet}
                role="tab"
                aria-selected={isActive}
                aria-controls={`sheet-panel-${sheet}`}
                id={`sheet-tab-${sheet}`}
                onClick={() => !disabled && onSheetChange(sheet)}
                disabled={disabled}
                className={[
                  // Base — touch target minimal 44px
                  "min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  // Active vs inactive
                  isActive
                    ? "bg-brand-green text-white shadow-sm"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-brand-green/40 hover:bg-brand-green/5 hover:text-brand-green",
                ].join(" ")}
              >
                {sheet}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SheetSelector;
