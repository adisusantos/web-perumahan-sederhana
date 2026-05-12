import React from "react";
import { createClient } from "@/lib/supabase/server";
import type { PollOption, PollResult, PollWithResults } from "@/types";
import { calculatePollResults } from "@/lib/voting";
import { PollCard } from "@/components/voting/PollCard";
import { VoteForm } from "@/components/voting/VoteForm";
import { VoteResults } from "@/components/voting/VoteResults";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Halaman voting publik — SSR (tidak ada ISR).
 *
 * Data poll harus real-time: setiap request mengambil data terbaru dari Supabase.
 * Hanya menampilkan poll dengan type = 'public' — TIDAK PERNAH type = 'gang'.
 *
 * Requirements: 4.4
 */
export const dynamic = "force-dynamic";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata = {
  title: "Voting — Portal Warga Bukit Pandawa",
  description:
    "Ikut berpartisipasi dalam pengambilan keputusan bersama warga perumahan Bukit Pandawa.",
};

// ─── Data Fetching ────────────────────────────────────────────────────────────

/**
 * Fetch semua poll publik (type = 'public') beserta opsi dan hasil voting.
 *
 * Urutan: poll aktif terlebih dahulu (diurutkan dari terbaru),
 * lalu poll selesai (diurutkan dari terbaru).
 *
 * PENTING: Filter type = 'public' wajib ada — poll gang TIDAK BOLEH muncul.
 */
async function fetchPublicPolls(): Promise<PollWithResults[]> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  // Fetch semua poll publik (aktif dan selesai)
  const { data: polls, error: pollsError } = await supabase
    .from("polls")
    .select("id, title, description, type, gang_scope, secret_token, status, closes_at, created_by, created_at")
    .eq("type", "public") // HANYA type = 'public', tidak pernah 'gang'
    .order("status", { ascending: true }) // 'active' < 'closed' secara alfabetis
    .order("created_at", { ascending: false });

  if (pollsError) {
    console.error("[voting] Gagal fetch polls:", pollsError.message);
    return [];
  }

  if (!polls || polls.length === 0) {
    return [];
  }

  const pollIds = polls.map((p) => p.id);

  // Fetch semua opsi untuk semua poll sekaligus (1 query, bukan N+1)
  const { data: allOptions, error: optionsError } = await supabase
    .from("poll_options")
    .select("id, poll_id, label, order")
    .in("poll_id", pollIds)
    .order("order", { ascending: true });

  if (optionsError) {
    console.error("[voting] Gagal fetch poll options:", optionsError.message);
    return [];
  }

  // Fetch jumlah vote per opsi untuk semua poll sekaligus
  const { data: allVotes, error: votesError } = await supabase
    .from("poll_votes")
    .select("poll_id, option_id")
    .in("poll_id", pollIds);

  if (votesError) {
    console.error("[voting] Gagal fetch poll votes:", votesError.message);
    return [];
  }

  // Normalisasi status: poll dengan closes_at yang sudah lewat dianggap 'closed'
  // meskipun status di DB masih 'active' (auto-close via timer)
  const normalizedPolls = polls.map((poll) => {
    if (
      poll.status === "active" &&
      poll.closes_at !== null &&
      new Date(poll.closes_at) <= new Date(now)
    ) {
      return { ...poll, status: "closed" as const };
    }
    return poll;
  });

  // Kelompokkan opsi per poll_id
  const optionsByPoll = new Map<string, PollOption[]>();
  for (const option of allOptions ?? []) {
    const existing = optionsByPoll.get(option.poll_id) ?? [];
    existing.push(option);
    optionsByPoll.set(option.poll_id, existing);
  }

  // Hitung vote count per option_id
  const voteCountByOption = new Map<string, number>();
  for (const vote of allVotes ?? []) {
    const current = voteCountByOption.get(vote.option_id) ?? 0;
    voteCountByOption.set(vote.option_id, current + 1);
  }

  // Gabungkan data poll + opsi + hasil
  const pollsWithResults: PollWithResults[] = normalizedPolls.map((poll) => {
    const options = optionsByPoll.get(poll.id) ?? [];
    const voteCounts = options.map((opt) => voteCountByOption.get(opt.id) ?? 0);
    const calculatedResults = calculatePollResults(voteCounts);

    const results: PollResult[] = options.map((opt, index) => ({
      option_id: opt.id,
      label: opt.label,
      vote_count: calculatedResults[index]?.vote_count ?? 0,
      percentage: calculatedResults[index]?.percentage ?? 0,
    }));

    const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0);

    return {
      ...poll,
      options,
      results,
      total_votes: totalVotes,
    };
  });

  return pollsWithResults;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Ikon ballot untuk empty state.
 */
function BallotIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
      />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Halaman daftar poll publik portal warga Bukit Pandawa.
 *
 * - Server Component dengan SSR (force-dynamic) — data real-time
 * - Hanya menampilkan poll type = 'public'
 * - Poll aktif: tampilkan VoteForm
 * - Poll selesai: tampilkan VoteResults
 *
 * Requirements: 4.4
 */
export default async function VotingPage() {
  const polls = await fetchPublicPolls();

  const activePolls = polls.filter((p) => p.status === "active");
  const closedPolls = polls.filter((p) => p.status === "closed");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* ── Judul halaman ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-black sm:text-2xl">
          Voting Warga
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Ikut berpartisipasi dalam pengambilan keputusan bersama warga
          perumahan Bukit Pandawa.
        </p>
      </div>

      {/* ── Empty state: tidak ada poll sama sekali ────────────────────── */}
      {polls.length === 0 && (
        <EmptyState
          title="Belum ada voting"
          description="Belum ada poll yang dibuat. Pantau terus halaman ini untuk informasi voting terbaru."
          icon={<BallotIcon />}
        />
      )}

      {/* ── Poll aktif ────────────────────────────────────────────────── */}
      {activePolls.length > 0 && (
        <section aria-labelledby="active-polls-heading" className="mb-8">
          <h2
            id="active-polls-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-green"
          >
            Sedang Berlangsung
          </h2>

          <div className="space-y-6">
            {activePolls.map((poll) => (
              <div
                key={poll.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                {/* Ringkasan poll */}
                <div className="p-4 pb-0">
                  <PollCard poll={poll} />
                </div>

                {/* Divider */}
                <div className="mx-4 my-4 border-t border-gray-100" aria-hidden="true" />

                {/* Form vote */}
                <div className="px-4 pb-4">
                  <VoteForm
                    pollId={poll.id}
                    options={poll.options}
                    initialResults={poll.results}
                    initialTotalVotes={poll.total_votes}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Poll selesai ──────────────────────────────────────────────── */}
      {closedPolls.length > 0 && (
        <section aria-labelledby="closed-polls-heading">
          <h2
            id="closed-polls-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400"
          >
            Sudah Selesai
          </h2>

          <div className="space-y-6">
            {closedPolls.map((poll) => (
              <div
                key={poll.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                {/* Ringkasan poll */}
                <div className="p-4 pb-0">
                  <PollCard poll={poll} />
                </div>

                {/* Divider */}
                <div className="mx-4 my-4 border-t border-gray-100" aria-hidden="true" />

                {/* Hasil voting */}
                <div className="px-4 pb-4">
                  <VoteResults
                    results={poll.results}
                    totalVotes={poll.total_votes}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
