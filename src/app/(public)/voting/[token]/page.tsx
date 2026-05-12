import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PollOption, PollResult, PollWithResults } from "@/types";
import { calculatePollResults } from "@/lib/voting";
import { PollCard } from "@/components/voting/PollCard";
import { VoteForm } from "@/components/voting/VoteForm";
import { VoteResults } from "@/components/voting/VoteResults";

/**
 * Halaman voting per gang — diakses via secret link.
 *
 * Poll gang tidak muncul di listing publik (/voting).
 * Halaman ini hanya bisa diakses oleh yang memiliki secret link.
 *
 * Jika token tidak valid (tidak ada atau salah), kembalikan 404 —
 * tidak membedakan "tidak ada" vs "salah token" (security by obscurity).
 *
 * SSR (force-dynamic) — data poll harus real-time.
 *
 * Requirements: 4.5
 */
export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ token: string }>;
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

/**
 * Fetch poll gang berdasarkan secret_token.
 *
 * Mengembalikan null jika:
 * - Token tidak ditemukan
 * - Poll bukan type = 'gang'
 *
 * Tidak membedakan "tidak ada" vs "salah token" untuk keamanan.
 */
async function fetchGangPoll(token: string): Promise<PollWithResults | null> {
  const supabase = await createClient();

  // Fetch poll berdasarkan secret_token, pastikan type = 'gang'
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select(
      "id, title, description, type, gang_scope, secret_token, status, closes_at, created_by, created_at"
    )
    .eq("secret_token", token)
    .eq("type", "gang") // Hanya poll gang yang bisa diakses via token
    .maybeSingle();

  if (pollError) {
    console.error("[voting/token] Gagal fetch poll:", pollError.message);
    return null;
  }

  if (!poll) {
    return null;
  }

  // Fetch opsi poll
  const { data: options, error: optionsError } = await supabase
    .from("poll_options")
    .select("id, poll_id, label, order")
    .eq("poll_id", poll.id)
    .order("order", { ascending: true });

  if (optionsError) {
    console.error(
      "[voting/token] Gagal fetch poll options:",
      optionsError.message
    );
    return null;
  }

  // Fetch jumlah vote per opsi
  const { data: votes, error: votesError } = await supabase
    .from("poll_votes")
    .select("option_id")
    .eq("poll_id", poll.id);

  if (votesError) {
    console.error(
      "[voting/token] Gagal fetch poll votes:",
      votesError.message
    );
    return null;
  }

  const pollOptions: PollOption[] = options ?? [];

  // Hitung vote count per option_id
  const voteCountByOption = new Map<string, number>();
  for (const vote of votes ?? []) {
    const current = voteCountByOption.get(vote.option_id) ?? 0;
    voteCountByOption.set(vote.option_id, current + 1);
  }

  const voteCounts = pollOptions.map(
    (opt) => voteCountByOption.get(opt.id) ?? 0
  );
  const calculatedResults = calculatePollResults(voteCounts);

  const results: PollResult[] = pollOptions.map((opt, index) => ({
    option_id: opt.id,
    label: opt.label,
    vote_count: calculatedResults[index]?.vote_count ?? 0,
    percentage: calculatedResults[index]?.percentage ?? 0,
  }));

  const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0);

  // Normalisasi status: poll dengan closes_at yang sudah lewat dianggap 'closed'
  const normalizedStatus =
    poll.status === "active" &&
    poll.closes_at !== null &&
    new Date(poll.closes_at) <= new Date()
      ? ("closed" as const)
      : poll.status;

  return {
    ...poll,
    status: normalizedStatus,
    options: pollOptions,
    results,
    total_votes: totalVotes,
  };
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  const poll = await fetchGangPoll(token);

  if (!poll) {
    return {
      title: "Voting — Portal Warga Bukit Pandawa",
    };
  }

  return {
    title: `${poll.title} — Voting Gang Bukit Pandawa`,
    description:
      poll.description ??
      `Ikut berpartisipasi dalam voting gang: ${poll.title}`,
    // Cegah indexing — halaman ini hanya untuk yang punya link
    robots: { index: false, follow: false },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Halaman voting per gang portal warga Bukit Pandawa.
 *
 * - Diakses via secret link: /voting/[token]
 * - Server Component dengan SSR (force-dynamic) — data real-time
 * - Token tidak valid → 404 (tidak membedakan "tidak ada" vs "salah token")
 * - Poll aktif: tampilkan VoteForm
 * - Poll selesai: tampilkan VoteResults
 * - Poll tidak muncul di listing publik /voting
 *
 * Requirements: 4.5
 */
export default async function GangVotingPage({ params }: PageProps) {
  const { token } = await params;
  const poll = await fetchGangPoll(token);

  // Token tidak valid → 404
  if (!poll) {
    notFound();
  }

  const isActive = poll.status === "active";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* ── Label gang ────────────────────────────────────────────────── */}
      {poll.gang_scope && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-green">
          {poll.gang_scope}
        </p>
      )}

      {/* ── Judul halaman ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-black sm:text-2xl">
          Voting Gang
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Halaman voting khusus untuk anggota gang. Hanya yang memiliki link ini
          yang dapat berpartisipasi.
        </p>
      </div>

      {/* ── Kartu poll ────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Ringkasan poll */}
        <div className="p-4 pb-0">
          <PollCard poll={poll} />
        </div>

        {/* Divider */}
        <div
          className="mx-4 my-4 border-t border-gray-100"
          aria-hidden="true"
        />

        {/* Form vote (aktif) atau hasil (selesai) */}
        <div className="px-4 pb-4">
          {isActive ? (
            <VoteForm
              pollId={poll.id}
              options={poll.options}
              initialResults={poll.results}
              initialTotalVotes={poll.total_votes}
            />
          ) : (
            <VoteResults
              results={poll.results}
              totalVotes={poll.total_votes}
            />
          )}
        </div>
      </div>

      {/* ── Catatan privasi ───────────────────────────────────────────── */}
      <p className="mt-4 text-center text-xs text-gray-400">
        Vote bersifat anonim. Identitas kamu tidak disimpan.
        Halaman ini hanya dapat diakses oleh yang memiliki link.
      </p>
    </div>
  );
}
