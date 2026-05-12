/**
 * API Route: /api/admin/polls
 *
 * Endpoint untuk pengelolaan poll oleh admin dan ketua gang.
 *
 * GET   — list polls
 *         Admin: semua poll dengan opsi dan jumlah vote
 *         Ketua gang: hanya poll milik sendiri (created_by = user ID)
 *
 * POST  — buat poll baru
 *         Admin: bisa buat poll publik atau per gang
 *         Ketua gang: hanya bisa buat poll per gang untuk gang sendiri
 *         Untuk type='gang': generate secret_token otomatis
 *
 * PATCH — tutup poll manual (update status = 'closed')
 *         Admin: bisa tutup semua poll
 *         Ketua gang: hanya bisa tutup poll milik sendiri
 *
 * Requirements: 4.6, 4.7, 5
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSecretToken } from "@/lib/utils";
import type { Poll, PollOption, PollType, UserRole } from "@/types";

// ─── Request / Response Types ─────────────────────────────────────────────────

interface PollWithOptions extends Poll {
  poll_options: PollOption[];
  total_votes: number;
}

interface PollsListResponse {
  success: true;
  data: PollWithOptions[];
}

interface PollResponse {
  success: true;
  data: PollWithOptions;
}

interface PollErrorResponse {
  success: false;
  error: string;
  message: string;
}

type ApiResponse = PollsListResponse | PollResponse | PollErrorResponse;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

interface AuthResult {
  userId: string;
  role: UserRole;
  gang: string | null;
}

/**
 * Verifikasi bahwa request berasal dari user yang terautentikasi
 * dengan role 'admin' atau 'ketua_gang'.
 * Mengembalikan userId, role, dan gang jika valid, atau null jika tidak.
 */
async function verifyAdminOrKetuaGang(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<AuthResult | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, gang")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    (profile.role !== "admin" && profile.role !== "ketua_gang")
  ) {
    return null;
  }

  return {
    userId: user.id,
    role: profile.role as UserRole,
    gang: profile.gang ?? null,
  };
}

// ─── GET /api/admin/polls ─────────────────────────────────────────────────────

/**
 * Ambil daftar poll beserta opsi dan jumlah vote.
 * Admin: semua poll.
 * Ketua gang: hanya poll milik sendiri.
 */
export async function GET(
  _request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  const auth = await verifyAdminOrKetuaGang(supabase);
  if (!auth) {
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message:
          "Akses ditolak. Hanya admin atau ketua gang yang dapat mengakses endpoint ini.",
      },
      { status: 403 }
    );
  }

  // Bangun query dasar
  let query = supabase
    .from("polls")
    .select(
      `
      id, title, description, type, gang_scope, secret_token,
      status, closes_at, created_by, created_at,
      poll_options ( id, poll_id, label, order )
    `
    )
    .order("created_at", { ascending: false });

  // Ketua gang hanya bisa lihat poll milik sendiri
  if (auth.role === "ketua_gang") {
    query = query.eq("created_by", auth.userId);
  }

  const { data: polls, error } = await query;

  if (error) {
    console.error("[GET /api/admin/polls] Supabase error:", error.message);
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat mengambil data poll.",
      },
      { status: 500 }
    );
  }

  if (!polls || polls.length === 0) {
    return NextResponse.json<PollsListResponse>(
      { success: true, data: [] },
      { status: 200 }
    );
  }

  // Ambil jumlah vote per poll
  const pollIds = polls.map((p) => p.id);
  const { data: voteCounts, error: voteError } = await supabase
    .from("poll_votes")
    .select("poll_id")
    .in("poll_id", pollIds);

  if (voteError) {
    console.error(
      "[GET /api/admin/polls] Vote count error:",
      voteError.message
    );
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat menghitung jumlah vote.",
      },
      { status: 500 }
    );
  }

  // Buat map poll_id → vote_count
  const voteCountMap = new Map<string, number>();
  for (const vote of voteCounts ?? []) {
    voteCountMap.set(vote.poll_id, (voteCountMap.get(vote.poll_id) ?? 0) + 1);
  }

  const data: PollWithOptions[] = polls.map((poll) => ({
    id: poll.id,
    title: poll.title,
    description: poll.description,
    type: poll.type as PollType,
    gang_scope: poll.gang_scope,
    secret_token: poll.secret_token,
    status: poll.status as Poll["status"],
    closes_at: poll.closes_at,
    created_by: poll.created_by,
    created_at: poll.created_at,
    poll_options: (poll.poll_options ?? []) as PollOption[],
    total_votes: voteCountMap.get(poll.id) ?? 0,
  }));

  return NextResponse.json<PollsListResponse>(
    { success: true, data },
    { status: 200 }
  );
}

// ─── POST /api/admin/polls ────────────────────────────────────────────────────

/**
 * Buat poll baru beserta opsi-opsinya.
 * Body: {
 *   title: string,
 *   description?: string,
 *   type: 'public' | 'gang',
 *   gang_scope?: string,
 *   options: string[],
 *   closes_at?: string
 * }
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  const auth = await verifyAdminOrKetuaGang(supabase);
  if (!auth) {
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message:
          "Akses ditolak. Hanya admin atau ketua gang yang dapat membuat poll.",
      },
      { status: 403 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request body harus berupa JSON yang valid.",
      },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request body tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  const {
    title,
    description,
    type,
    gang_scope,
    options,
    closes_at,
  } = body as Record<string, unknown>;

  // Validasi title
  if (!title || typeof title !== "string" || title.trim() === "") {
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'title' wajib diisi dan tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  // Validasi type
  if (type !== "public" && type !== "gang") {
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'type' harus bernilai 'public' atau 'gang'.",
      },
      { status: 400 }
    );
  }

  // Validasi gang_scope wajib ada jika type = 'gang'
  if (type === "gang") {
    if (
      !gang_scope ||
      typeof gang_scope !== "string" ||
      gang_scope.trim() === ""
    ) {
      return NextResponse.json<PollErrorResponse>(
        {
          success: false,
          error: "validation_error",
          message:
            "Field 'gang_scope' wajib diisi untuk poll dengan type 'gang'.",
        },
        { status: 400 }
      );
    }
  }

  // Validasi otorisasi berdasarkan role
  if (auth.role === "ketua_gang") {
    // Ketua gang hanya bisa buat poll per gang
    if (type !== "gang") {
      return NextResponse.json<PollErrorResponse>(
        {
          success: false,
          error: "forbidden",
          message:
            "Ketua gang hanya dapat membuat poll dengan type 'gang'.",
        },
        { status: 403 }
      );
    }

    // Ketua gang hanya bisa buat poll untuk gang sendiri
    if (
      typeof gang_scope === "string" &&
      gang_scope.trim() !== auth.gang
    ) {
      return NextResponse.json<PollErrorResponse>(
        {
          success: false,
          error: "forbidden",
          message:
            "Ketua gang hanya dapat membuat poll untuk gang miliknya sendiri.",
        },
        { status: 403 }
      );
    }
  }

  // Validasi options: array minimal 2 string non-kosong
  if (!Array.isArray(options) || options.length < 2) {
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'options' harus berupa array dengan minimal 2 pilihan.",
      },
      { status: 400 }
    );
  }

  const cleanedOptions = options.map((opt) =>
    typeof opt === "string" ? opt.trim() : ""
  );

  if (cleanedOptions.some((opt) => opt === "")) {
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Setiap pilihan dalam 'options' tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  // Validasi closes_at jika disertakan
  if (closes_at !== undefined && closes_at !== null) {
    if (typeof closes_at !== "string" || isNaN(Date.parse(closes_at))) {
      return NextResponse.json<PollErrorResponse>(
        {
          success: false,
          error: "validation_error",
          message:
            "Field 'closes_at' harus berupa string tanggal ISO 8601 yang valid.",
        },
        { status: 400 }
      );
    }
  }

  // Generate secret_token untuk poll gang
  const secretToken = type === "gang" ? generateSecretToken() : null;

  // Insert poll
  const { data: newPoll, error: pollInsertError } = await supabase
    .from("polls")
    .insert({
      title: title.trim(),
      description:
        description && typeof description === "string"
          ? description.trim() || null
          : null,
      type,
      gang_scope:
        type === "gang" && typeof gang_scope === "string"
          ? gang_scope.trim()
          : null,
      secret_token: secretToken,
      status: "active",
      closes_at:
        closes_at !== undefined && closes_at !== null ? closes_at : null,
      created_by: auth.userId,
    })
    .select(
      "id, title, description, type, gang_scope, secret_token, status, closes_at, created_by, created_at"
    )
    .single();

  if (pollInsertError || !newPoll) {
    console.error(
      "[POST /api/admin/polls] Poll insert error:",
      pollInsertError?.message
    );
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat menyimpan poll.",
      },
      { status: 500 }
    );
  }

  // Insert poll_options
  const optionsToInsert = cleanedOptions.map((label, index) => ({
    poll_id: newPoll.id,
    label,
    order: index,
  }));

  const { data: insertedOptions, error: optionsInsertError } = await supabase
    .from("poll_options")
    .insert(optionsToInsert)
    .select("id, poll_id, label, order");

  if (optionsInsertError || !insertedOptions) {
    console.error(
      "[POST /api/admin/polls] Options insert error:",
      optionsInsertError?.message
    );
    // Poll sudah tersimpan tapi opsi gagal — hapus poll untuk konsistensi
    await supabase.from("polls").delete().eq("id", newPoll.id);
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat menyimpan pilihan poll.",
      },
      { status: 500 }
    );
  }

  const responseData: PollWithOptions = {
    id: newPoll.id,
    title: newPoll.title,
    description: newPoll.description,
    type: newPoll.type as PollType,
    gang_scope: newPoll.gang_scope,
    secret_token: newPoll.secret_token,
    status: newPoll.status as Poll["status"],
    closes_at: newPoll.closes_at,
    created_by: newPoll.created_by,
    created_at: newPoll.created_at,
    poll_options: insertedOptions as PollOption[],
    total_votes: 0,
  };

  return NextResponse.json<PollResponse>(
    { success: true, data: responseData },
    { status: 201 }
  );
}

// ─── PATCH /api/admin/polls ───────────────────────────────────────────────────

/**
 * Tutup poll secara manual (update status = 'closed').
 * Body: { id: string }
 * Admin: bisa tutup semua poll.
 * Ketua gang: hanya bisa tutup poll milik sendiri.
 */
export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  const auth = await verifyAdminOrKetuaGang(supabase);
  if (!auth) {
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message:
          "Akses ditolak. Hanya admin atau ketua gang yang dapat menutup poll.",
      },
      { status: 403 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request body harus berupa JSON yang valid.",
      },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request body tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  const { id } = body as Record<string, unknown>;

  // Validasi ID
  if (!id || typeof id !== "string" || !isValidUUID(id)) {
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'id' wajib diisi dan harus berupa UUID yang valid.",
      },
      { status: 400 }
    );
  }

  // Ambil data poll untuk verifikasi kepemilikan
  const { data: existingPoll, error: fetchError } = await supabase
    .from("polls")
    .select("id, created_by, status")
    .eq("id", id)
    .single();

  if (fetchError || !existingPoll) {
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "not_found",
        message: "Poll dengan ID tersebut tidak ditemukan.",
      },
      { status: 404 }
    );
  }

  // Ketua gang hanya bisa tutup poll milik sendiri
  if (
    auth.role === "ketua_gang" &&
    existingPoll.created_by !== auth.userId
  ) {
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "forbidden",
        message: "Ketua gang hanya dapat menutup poll miliknya sendiri.",
      },
      { status: 403 }
    );
  }

  // Update status poll menjadi 'closed'
  const { data: updatedPoll, error: updateError } = await supabase
    .from("polls")
    .update({ status: "closed" })
    .eq("id", id)
    .select(
      "id, title, description, type, gang_scope, secret_token, status, closes_at, created_by, created_at"
    )
    .single();

  if (updateError || !updatedPoll) {
    console.error(
      "[PATCH /api/admin/polls] Update error:",
      updateError?.message
    );
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat menutup poll.",
      },
      { status: 500 }
    );
  }

  // Ambil opsi poll
  const { data: pollOptions, error: optionsError } = await supabase
    .from("poll_options")
    .select("id, poll_id, label, order")
    .eq("poll_id", id)
    .order("order", { ascending: true });

  if (optionsError) {
    console.error(
      "[PATCH /api/admin/polls] Options fetch error:",
      optionsError.message
    );
    return NextResponse.json<PollErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Poll berhasil ditutup, tetapi gagal mengambil data opsi.",
      },
      { status: 500 }
    );
  }

  // Hitung total vote
  const { data: votes, error: votesError } = await supabase
    .from("poll_votes")
    .select("poll_id")
    .eq("poll_id", id);

  if (votesError) {
    console.error(
      "[PATCH /api/admin/polls] Vote count error:",
      votesError.message
    );
  }

  const responseData: PollWithOptions = {
    id: updatedPoll.id,
    title: updatedPoll.title,
    description: updatedPoll.description,
    type: updatedPoll.type as PollType,
    gang_scope: updatedPoll.gang_scope,
    secret_token: updatedPoll.secret_token,
    status: updatedPoll.status as Poll["status"],
    closes_at: updatedPoll.closes_at,
    created_by: updatedPoll.created_by,
    created_at: updatedPoll.created_at,
    poll_options: (pollOptions ?? []) as PollOption[],
    total_votes: votes?.length ?? 0,
  };

  return NextResponse.json<PollResponse>(
    { success: true, data: responseData },
    { status: 200 }
  );
}
