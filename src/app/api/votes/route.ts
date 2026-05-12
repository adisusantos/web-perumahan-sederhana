/**
 * API Route: POST /api/votes
 *
 * Menerima vote dari warga untuk poll yang aktif.
 * Validasi request body, cek status poll, insert ke poll_votes,
 * dan kembalikan hasil terbaru setelah vote berhasil.
 *
 * Response 200: VoteResponse (vote berhasil + hasil terbaru)
 * Response 400: VoteClosedResponse (poll sudah ditutup)
 * Response 400: VoteInvalidResponse (request tidak valid)
 * Response 404: VoteNotFoundResponse (poll tidak ditemukan)
 * Response 409: VoteConflictResponse (sudah pernah vote)
 * Response 500: VoteErrorResponse (kesalahan server)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculatePollResults } from "@/lib/voting";
import type { PollResult } from "@/types";

// ─── Request / Response Types ─────────────────────────────────────────────────

interface VoteRequest {
  poll_id: string;          // UUID
  option_id: string;        // UUID
  fingerprint_hash: string; // SHA-256 hex string (64 karakter)
}

interface VoteResponse {
  success: true;
  results: PollResult[];
}

interface VoteConflictResponse {
  success: false;
  error: "already_voted";
}

interface VoteClosedResponse {
  success: false;
  error: "poll_closed";
}

interface VoteNotFoundResponse {
  success: false;
  error: "poll_not_found";
}

interface VoteInvalidResponse {
  success: false;
  error: "invalid_request";
  message: string;
}

interface VoteErrorResponse {
  success: false;
  error: "server_error";
  message: string;
}

type ApiResponse =
  | VoteResponse
  | VoteConflictResponse
  | VoteClosedResponse
  | VoteNotFoundResponse
  | VoteInvalidResponse
  | VoteErrorResponse;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validasi format fingerprint_hash: harus 64 karakter hex lowercase.
 */
function isValidFingerprintHash(hash: string): boolean {
  return /^[0-9a-f]{64}$/.test(hash);
}

/**
 * Validasi format UUID v4.
 */
function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  // ── 1. Parse dan validasi request body ──────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<VoteInvalidResponse>(
      { success: false, error: "invalid_request", message: "Request body harus berupa JSON yang valid." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json<VoteInvalidResponse>(
      { success: false, error: "invalid_request", message: "Request body tidak boleh kosong." },
      { status: 400 }
    );
  }

  const { poll_id, option_id, fingerprint_hash } = body as Partial<VoteRequest>;

  // Validasi keberadaan field
  if (!poll_id || !option_id || !fingerprint_hash) {
    return NextResponse.json<VoteInvalidResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Field poll_id, option_id, dan fingerprint_hash wajib diisi.",
      },
      { status: 400 }
    );
  }

  // Validasi tipe data
  if (
    typeof poll_id !== "string" ||
    typeof option_id !== "string" ||
    typeof fingerprint_hash !== "string"
  ) {
    return NextResponse.json<VoteInvalidResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "poll_id, option_id, dan fingerprint_hash harus berupa string.",
      },
      { status: 400 }
    );
  }

  // Validasi format UUID
  if (!isValidUUID(poll_id) || !isValidUUID(option_id)) {
    return NextResponse.json<VoteInvalidResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "poll_id dan option_id harus berupa UUID yang valid.",
      },
      { status: 400 }
    );
  }

  // Validasi format fingerprint_hash
  if (!isValidFingerprintHash(fingerprint_hash)) {
    return NextResponse.json<VoteInvalidResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "fingerprint_hash harus berupa string hex SHA-256 (64 karakter lowercase).",
      },
      { status: 400 }
    );
  }

  // ── 2. Inisialisasi Supabase admin client ────────────────────────────────────
  // Menggunakan service role untuk bypass RLS pada operasi insert vote
  // (RLS policy poll_votes_insert_anon mengizinkan insert tanpa auth,
  //  tapi kita gunakan admin client untuk konsistensi dan kemudahan query)
  const supabase = createAdminClient();

  // ── 3. Ambil data poll dan validasi status ───────────────────────────────────
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id, status, closes_at")
    .eq("id", poll_id)
    .single();

  if (pollError || !poll) {
    return NextResponse.json<VoteNotFoundResponse>(
      { success: false, error: "poll_not_found" },
      { status: 404 }
    );
  }

  // Cek apakah poll sudah ditutup (status = 'closed')
  if (poll.status === "closed") {
    return NextResponse.json<VoteClosedResponse>(
      { success: false, error: "poll_closed" },
      { status: 400 }
    );
  }

  // Cek apakah closes_at sudah lewat (timer otomatis)
  if (poll.closes_at !== null) {
    const closesAt = new Date(poll.closes_at);
    if (closesAt <= new Date()) {
      // Update status poll menjadi 'closed' karena timer sudah habis
      await supabase
        .from("polls")
        .update({ status: "closed" })
        .eq("id", poll_id);

      return NextResponse.json<VoteClosedResponse>(
        { success: false, error: "poll_closed" },
        { status: 400 }
      );
    }
  }

  // ── 4. Insert vote ke poll_votes ─────────────────────────────────────────────
  const { error: insertError } = await supabase.from("poll_votes").insert({
    poll_id,
    option_id,
    fingerprint_hash,
  });

  if (insertError) {
    // Tangani UNIQUE constraint violation (double-vote)
    // Supabase/PostgreSQL mengembalikan kode error '23505' untuk unique violation
    if (
      insertError.code === "23505" ||
      insertError.message?.toLowerCase().includes("unique") ||
      insertError.message?.toLowerCase().includes("duplicate")
    ) {
      return NextResponse.json<VoteConflictResponse>(
        { success: false, error: "already_voted" },
        { status: 409 }
      );
    }

    // Error lainnya (misal: option_id tidak valid / FK violation)
    console.error("[POST /api/votes] Insert error:", insertError);
    return NextResponse.json<VoteErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat menyimpan vote. Silakan coba lagi.",
      },
      { status: 500 }
    );
  }

  // ── 5. Ambil hasil terbaru setelah vote berhasil ─────────────────────────────
  // Query semua opsi poll beserta jumlah vote masing-masing
  const { data: options, error: optionsError } = await supabase
    .from("poll_options")
    .select("id, label, order")
    .eq("poll_id", poll_id)
    .order("order", { ascending: true });

  if (optionsError || !options) {
    console.error("[POST /api/votes] Options query error:", optionsError);
    return NextResponse.json<VoteErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Vote berhasil disimpan, tetapi gagal mengambil hasil terbaru.",
      },
      { status: 500 }
    );
  }

  // Hitung jumlah vote per opsi
  const { data: votes, error: votesError } = await supabase
    .from("poll_votes")
    .select("option_id")
    .eq("poll_id", poll_id);

  if (votesError) {
    console.error("[POST /api/votes] Votes query error:", votesError);
    return NextResponse.json<VoteErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Vote berhasil disimpan, tetapi gagal menghitung hasil terbaru.",
      },
      { status: 500 }
    );
  }

  // Buat map option_id → vote_count
  const voteCountMap = new Map<string, number>();
  for (const option of options) {
    voteCountMap.set(option.id, 0);
  }
  for (const vote of votes ?? []) {
    const current = voteCountMap.get(vote.option_id) ?? 0;
    voteCountMap.set(vote.option_id, current + 1);
  }

  // Hitung persentase menggunakan calculatePollResults
  const voteCounts = options.map((opt) => voteCountMap.get(opt.id) ?? 0);
  const calculatedResults = calculatePollResults(voteCounts);

  // Gabungkan dengan label dari poll_options
  const results: PollResult[] = options.map((opt, index) => ({
    option_id: opt.id,
    label: opt.label,
    vote_count: calculatedResults[index].vote_count,
    percentage: calculatedResults[index].percentage,
  }));

  return NextResponse.json<VoteResponse>(
    { success: true, results },
    { status: 200 }
  );
}
