/**
 * VoteResults — tampilan hasil voting real-time
 *
 * Menampilkan persentase dan jumlah suara per opsi dalam bentuk progress bar.
 * Digunakan setelah warga vote, atau untuk poll yang sudah selesai.
 *
 * Mobile-first, accessible.
 */

import React from "react";
import type { PollResult } from "@/types";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface VoteResultsProps {
  /** Hasil voting per opsi */
  results: PollResult[];
  /** Total suara keseluruhan */
  totalVotes: number;
  /** option_id yang dipilih warga saat ini (untuk highlight) */
  selectedOptionId?: string;
  /** Class tambahan untuk container */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Komponen hasil voting real-time.
 *
 * Menampilkan setiap opsi dengan:
 * - Label opsi
 * - Progress bar persentase
 * - Persentase (1 desimal)
 * - Jumlah suara
 *
 * Opsi yang dipilih warga di-highlight dengan warna brand-green.
 *
 * Accessible: menggunakan role="list", progressbar dengan aria-valuenow.
 */
export function VoteResults({
  results,
  totalVotes,
  selectedOptionId,
  className = "",
}: VoteResultsProps) {
  return (
    <div
      className={["space-y-3", className].filter(Boolean).join(" ")}
      aria-label="Hasil voting"
    >
      {/* Total suara */}
      <p className="text-sm text-gray-500">
        Total:{" "}
        <span className="font-medium text-brand-black">
          {totalVotes.toLocaleString("id-ID")} suara
        </span>
      </p>

      {/* Daftar hasil per opsi */}
      <ul role="list" className="space-y-3">
        {results.map((result) => {
          const isSelected = result.option_id === selectedOptionId;
          const percentage = result.percentage;

          return (
            <li key={result.option_id} className="space-y-1">
              {/* Label + persentase */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={[
                    "flex items-center gap-1.5 text-sm font-medium",
                    isSelected ? "text-brand-green" : "text-brand-black",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {/* Centang untuk opsi yang dipilih */}
                  {isSelected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {result.label}
                </span>
                <span
                  className={[
                    "shrink-0 text-sm font-semibold tabular-nums",
                    isSelected ? "text-brand-green" : "text-gray-600",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={`${percentage}%`}
                >
                  {percentage.toFixed(1)}%
                </span>
              </div>

              {/* Progress bar */}
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${result.label}: ${percentage}%`}
              >
                <div
                  className={[
                    "h-full rounded-full transition-all duration-500",
                    isSelected ? "bg-brand-green" : "bg-gray-300",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Jumlah suara */}
              <p className="text-right text-xs text-gray-400">
                {result.vote_count.toLocaleString("id-ID")} suara
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default VoteResults;
