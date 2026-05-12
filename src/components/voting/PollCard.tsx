/**
 * PollCard — ringkasan poll untuk halaman listing /voting
 *
 * Menampilkan: judul, status, jumlah suara, waktu tersisa / tanggal selesai,
 * dan nama pembuat poll.
 *
 * Mobile-first, touch target minimal 44px.
 */

import React from "react";
import type { PollWithResults } from "@/types";
import { Badge } from "@/components/ui/Badge";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format waktu tersisa dari sekarang hingga closes_at.
 * Mengembalikan string seperti "2 hari lagi", "3 jam lagi", atau "Kurang dari 1 jam".
 */
function formatTimeRemaining(closesAt: string): string {
  const now = new Date();
  const end = new Date(closesAt);
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return "Segera berakhir";

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 1) return `${diffDays} hari lagi`;
  if (diffHours >= 1) return `${diffHours} jam lagi`;
  if (diffMinutes >= 1) return `${diffMinutes} menit lagi`;
  return "Kurang dari 1 menit";
}

/**
 * Format tanggal selesai ke format lokal Indonesia.
 * Contoh: "15 Jan 2025, 20:00"
 */
function formatClosedDate(closesAt: string): string {
  return new Date(closesAt).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PollCardProps {
  /** Data poll lengkap dengan hasil */
  poll: PollWithResults;
  /** Nama pembuat poll (dari tabel profiles) */
  creatorName?: string;
  /** Class tambahan untuk container */
  className?: string;
  /** Callback saat card diklik (opsional) */
  onClick?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Komponen kartu ringkasan poll.
 *
 * Menampilkan informasi utama poll dalam format kartu yang bisa diklik.
 * Digunakan di halaman /voting untuk listing semua poll publik.
 *
 * Accessible: menggunakan role="article" dan aria-label yang deskriptif.
 */
export function PollCard({
  poll,
  creatorName,
  className = "",
  onClick,
}: PollCardProps) {
  const isActive = poll.status === "active";

  // Tentukan teks waktu
  let timeText: string;
  let timeLabel: string;
  if (isActive && poll.closes_at) {
    timeText = formatTimeRemaining(poll.closes_at);
    timeLabel = "Waktu tersisa";
  } else if (!isActive && poll.closes_at) {
    timeText = formatClosedDate(poll.closes_at);
    timeLabel = "Berakhir";
  } else if (isActive) {
    timeText = "Tidak ada batas waktu";
    timeLabel = "Durasi";
  } else {
    timeText = "Ditutup manual";
    timeLabel = "Penutupan";
  }

  const cardContent = (
    <article
      aria-label={`Poll: ${poll.title}`}
      className={[
        "rounded-xl border border-gray-200 bg-white p-4 shadow-sm",
        "transition-shadow duration-150",
        onClick ? "cursor-pointer hover:shadow-md active:shadow-sm" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      role={onClick ? "button" : "article"}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Header: judul + badge status */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex-1 text-base font-semibold leading-snug text-brand-black">
          {poll.title}
        </h3>
        <Badge pollStatus={poll.status} />
      </div>

      {/* Deskripsi (opsional) */}
      {poll.description && (
        <p className="mt-2 line-clamp-2 text-sm text-gray-500">
          {poll.description}
        </p>
      )}

      {/* Divider */}
      <div className="my-3 border-t border-gray-100" aria-hidden="true" />

      {/* Meta info: jumlah suara + waktu */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
        {/* Jumlah suara */}
        <div className="flex items-center gap-1.5">
          {/* Ikon ballot */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 shrink-0 text-gray-400"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            <span className="font-medium text-brand-black">
              {poll.total_votes.toLocaleString("id-ID")}
            </span>{" "}
            suara
          </span>
        </div>

        {/* Waktu tersisa / tanggal selesai */}
        <div className="flex items-center gap-1.5">
          {/* Ikon jam */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 shrink-0 text-gray-400"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            <span className="sr-only">{timeLabel}: </span>
            {timeText}
          </span>
        </div>
      </div>

      {/* Pembuat poll */}
      {creatorName && (
        <p className="mt-2 text-xs text-gray-400">
          Dibuat oleh{" "}
          <span className="font-medium text-gray-500">{creatorName}</span>
        </p>
      )}
    </article>
  );

  return cardContent;
}

export default PollCard;
