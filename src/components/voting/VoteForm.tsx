"use client";

/**
 * VoteForm — form pilihan vote untuk poll aktif
 *
 * Alur:
 * 1. Cek sessionStorage dengan key `voted_<poll_id>` — jika sudah vote,
 *    langsung tampilkan VoteResults.
 * 2. Tampilkan daftar pilihan (radio button) dan tombol submit.
 * 3. Saat submit: generate fingerprint → hash → POST /api/votes.
 * 4. Jika berhasil: simpan ke sessionStorage, tampilkan VoteResults.
 * 5. Jika already_voted (409): simpan ke sessionStorage, tampilkan hasil.
 * 6. Jika poll_closed (400): tampilkan pesan poll sudah ditutup.
 *
 * Mobile-first, touch target minimal 44px.
 */

import React, { useEffect, useState } from "react";
import type { PollOption, PollResult } from "@/types";
import { generateFingerprint, hashFingerprint } from "@/lib/fingerprint";
import { Button } from "@/components/ui/Button";
import { VoteResults } from "@/components/voting/VoteResults";

// ─── Session Storage Helpers ──────────────────────────────────────────────────

const SESSION_KEY_PREFIX = "voted_";

function getSessionVoteKey(pollId: string): string {
  return `${SESSION_KEY_PREFIX}${pollId}`;
}

/**
 * Cek apakah warga sudah vote untuk poll ini di session saat ini.
 * Mengembalikan option_id yang dipilih, atau null jika belum vote.
 */
function getSessionVote(pollId: string): string | null {
  try {
    return sessionStorage.getItem(getSessionVoteKey(pollId));
  } catch {
    // sessionStorage tidak tersedia (SSR, private mode tertentu)
    return null;
  }
}

/**
 * Simpan status sudah-vote ke sessionStorage.
 * @param pollId - ID poll
 * @param optionId - ID opsi yang dipilih
 */
function saveSessionVote(pollId: string, optionId: string): void {
  try {
    sessionStorage.setItem(getSessionVoteKey(pollId), optionId);
  } catch {
    // Abaikan jika sessionStorage tidak tersedia
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type VoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "voted"; results: PollResult[]; totalVotes: number; selectedOptionId: string }
  | { status: "error"; message: string }
  | { status: "poll_closed" };

// ─── Props ────────────────────────────────────────────────────────────────────

export interface VoteFormProps {
  /** ID poll */
  pollId: string;
  /** Daftar opsi poll */
  options: PollOption[];
  /** Hasil awal (untuk poll yang sudah ada votes) */
  initialResults?: PollResult[];
  /** Total suara awal */
  initialTotalVotes?: number;
  /** Class tambahan untuk container */
  className?: string;
  /** Callback setelah vote berhasil */
  onVoted?: (results: PollResult[], totalVotes: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Komponen form voting untuk poll aktif.
 *
 * Mengelola state lokal: status sudah-vote (via sessionStorage),
 * pilihan yang dipilih, loading state, dan error handling.
 *
 * Menggunakan `generateFingerprint` dan `hashFingerprint` dari fingerprint.ts
 * untuk anti double-vote berbasis browser attributes.
 *
 * Accessible: menggunakan fieldset/legend, radio inputs dengan label,
 * dan aria-live untuk pesan status.
 */
export function VoteForm({
  pollId,
  options,
  initialResults,
  initialTotalVotes = 0,
  className = "",
  onVoted,
}: VoteFormProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [voteState, setVoteState] = useState<VoteState>({ status: "idle" });

  // Cek sessionStorage saat mount (client-side only)
  useEffect(() => {
    const savedOptionId = getSessionVote(pollId);
    if (savedOptionId && initialResults) {
      setVoteState({
        status: "voted",
        results: initialResults,
        totalVotes: initialTotalVotes,
        selectedOptionId: savedOptionId,
      });
    }
  }, [pollId, initialResults, initialTotalVotes]);

  // ── Submit handler ──────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedOptionId) return;

    setVoteState({ status: "loading" });

    try {
      // Generate fingerprint dan hash
      const fingerprint = generateFingerprint();
      const fingerprintHash = await hashFingerprint(fingerprint);

      // Kirim vote ke API
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poll_id: pollId,
          option_id: selectedOptionId,
          fingerprint_hash: fingerprintHash,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Vote berhasil
        const results: PollResult[] = data.results;
        const totalVotes = results.reduce((sum, r) => sum + r.vote_count, 0);

        saveSessionVote(pollId, selectedOptionId);
        setVoteState({
          status: "voted",
          results,
          totalVotes,
          selectedOptionId,
        });
        onVoted?.(results, totalVotes);
        return;
      }

      // Tangani error responses
      if (response.status === 409 && data.error === "already_voted") {
        // Sudah vote sebelumnya (fingerprint match di DB)
        // Simpan ke session agar tidak perlu cek DB lagi
        saveSessionVote(pollId, selectedOptionId);
        if (initialResults) {
          setVoteState({
            status: "voted",
            results: initialResults,
            totalVotes: initialTotalVotes,
            selectedOptionId,
          });
        } else {
          setVoteState({
            status: "error",
            message: "Kamu sudah pernah vote untuk poll ini sebelumnya.",
          });
        }
        return;
      }

      if (response.status === 400 && data.error === "poll_closed") {
        setVoteState({ status: "poll_closed" });
        return;
      }

      // Error lainnya
      setVoteState({
        status: "error",
        message:
          data.message ??
          "Terjadi kesalahan saat mengirim vote. Silakan coba lagi.",
      });
    } catch {
      setVoteState({
        status: "error",
        message: "Gagal terhubung ke server. Periksa koneksi internet kamu.",
      });
    }
  }

  // ── Render: sudah vote → tampilkan hasil ────────────────────────────────────
  if (voteState.status === "voted") {
    return (
      <div className={["space-y-4", className].filter(Boolean).join(" ")}>
        {/* Konfirmasi vote */}
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5 shrink-0 text-green-600"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
          <span>Vote kamu sudah tercatat.</span>
        </div>

        {/* Hasil voting */}
        <VoteResults
          results={voteState.results}
          totalVotes={voteState.totalVotes}
          selectedOptionId={voteState.selectedOptionId}
        />
      </div>
    );
  }

  // ── Render: poll sudah ditutup ───────────────────────────────────────────────
  if (voteState.status === "poll_closed") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={[
          "rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        Poll ini sudah ditutup dan tidak menerima vote baru.
      </div>
    );
  }

  // ── Render: form vote ────────────────────────────────────────────────────────
  const isLoading = voteState.status === "loading";

  return (
    <div className={["space-y-4", className].filter(Boolean).join(" ")}>
      {/* Tampilkan hasil sementara jika ada votes */}
      {initialResults && initialTotalVotes > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-3 text-sm font-medium text-gray-700">
            Hasil Sementara ({initialTotalVotes} suara):
          </p>
          <div className="space-y-2">
            {initialResults.map((result) => {
              const percentage = result.percentage.toFixed(1);
              return (
                <div key={result.option_id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{result.label}</span>
                    <span className="text-gray-500">
                      {result.vote_count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-brand-green transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        aria-label="Form voting"
      >
      {/* Pesan error */}
      {voteState.status === "error" && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span>{voteState.message}</span>
        </div>
      )}

      {/* Pilihan vote */}
      <fieldset disabled={isLoading}>
        <legend className="mb-3 text-sm font-medium text-gray-700">
          Pilih salah satu opsi:
        </legend>

        <div className="space-y-2" role="radiogroup">
          {options.map((option) => {
            const isChecked = selectedOptionId === option.id;

            return (
              <label
                key={option.id}
                className={[
                  // Touch target minimal 44px
                  "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-4 py-3",
                  "transition-colors duration-150",
                  isChecked
                    ? "border-brand-green bg-green-50 text-brand-green"
                    : "border-gray-200 bg-white text-brand-black hover:border-gray-300 hover:bg-gray-50",
                  isLoading ? "cursor-not-allowed opacity-60" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  type="radio"
                  name={`poll_option_${pollId}`}
                  value={option.id}
                  checked={isChecked}
                  onChange={() => setSelectedOptionId(option.id)}
                  disabled={isLoading}
                  className="h-4 w-4 shrink-0 accent-brand-green"
                  aria-label={option.label}
                />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Tombol submit */}
      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={isLoading}
        disabled={!selectedOptionId || isLoading}
        className="w-full"
        aria-label={
          isLoading
            ? "Mengirim vote…"
            : !selectedOptionId
              ? "Pilih opsi terlebih dahulu"
              : "Kirim vote"
        }
      >
        {isLoading ? "Mengirim…" : "Kirim Vote"}
      </Button>

      {/* Catatan privasi */}
      <p className="text-center text-xs text-gray-400">
        Vote bersifat anonim. Identitas kamu tidak disimpan.
      </p>
    </form>
    </div>
  );
}

export default VoteForm;
