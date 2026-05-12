/**
 * API Route: /api/admin/announcements
 *
 * Endpoint CRUD untuk pengelolaan pengumuman oleh admin.
 * Semua endpoint memerlukan autentikasi dan role 'admin'.
 *
 * GET    — ambil semua pengumuman (admin only)
 * POST   — buat pengumuman baru (admin only), validasi title, body, priority
 * PUT    — edit pengumuman (admin only)
 * DELETE — hapus pengumuman (admin only)
 *
 * Requirements: 4.6
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Announcement, AnnouncementPriority } from "@/types";

// ─── Request / Response Types ─────────────────────────────────────────────────

interface AnnouncementsListResponse {
  success: true;
  data: Announcement[];
}

interface AnnouncementResponse {
  success: true;
  data: Announcement;
}

interface AnnouncementDeleteResponse {
  success: true;
  message: string;
}

interface AnnouncementErrorResponse {
  success: false;
  error: string;
  message: string;
}

type ApiResponse =
  | AnnouncementsListResponse
  | AnnouncementResponse
  | AnnouncementDeleteResponse
  | AnnouncementErrorResponse;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_PRIORITIES: AnnouncementPriority[] = ["normal", "urgent"];

function isValidPriority(value: unknown): value is AnnouncementPriority {
  return typeof value === "string" && VALID_PRIORITIES.includes(value as AnnouncementPriority);
}

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Verifikasi bahwa request berasal dari user yang terautentikasi dengan role 'admin'.
 * Mengembalikan user ID jika valid, atau null jika tidak.
 */
async function verifyAdminRole(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ userId: string } | null> {
  // Ambil session user yang sedang login
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Cek role dari tabel profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    return null;
  }

  return { userId: user.id };
}

// ─── GET /api/admin/announcements ─────────────────────────────────────────────

/**
 * Ambil semua pengumuman, diurutkan dari yang terbaru.
 * Hanya bisa diakses oleh admin.
 */
export async function GET(
  _request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  // Verifikasi role admin
  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message: "Akses ditolak. Hanya admin yang dapat mengakses endpoint ini.",
      },
      { status: 403 }
    );
  }

  // Ambil semua pengumuman
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, priority, created_by, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/admin/announcements] Supabase error:", error.message);
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat mengambil data pengumuman.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json<AnnouncementsListResponse>(
    { success: true, data: data ?? [] },
    { status: 200 }
  );
}

// ─── POST /api/admin/announcements ────────────────────────────────────────────

/**
 * Buat pengumuman baru.
 * Body: { title: string, body: string, priority: "normal" | "urgent" }
 * Hanya bisa diakses oleh admin.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  // Verifikasi role admin
  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message: "Akses ditolak. Hanya admin yang dapat membuat pengumuman.",
      },
      { status: 403 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request body harus berupa JSON yang valid.",
      },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request body tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  const { title, body: announcementBody, priority } = body as Record<string, unknown>;

  // Validasi field wajib
  if (!title || typeof title !== "string" || title.trim() === "") {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'title' wajib diisi dan tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  if (!announcementBody || typeof announcementBody !== "string" || announcementBody.trim() === "") {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'body' wajib diisi dan tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  if (!isValidPriority(priority)) {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'priority' harus bernilai 'normal' atau 'urgent'.",
      },
      { status: 400 }
    );
  }

  // Insert pengumuman baru
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title: title.trim(),
      body: announcementBody.trim(),
      priority,
      created_by: admin.userId,
    })
    .select("id, title, body, priority, created_by, created_at, updated_at")
    .single();

  if (error || !data) {
    console.error("[POST /api/admin/announcements] Supabase error:", error?.message);
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat menyimpan pengumuman.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json<AnnouncementResponse>(
    { success: true, data },
    { status: 201 }
  );
}

// ─── PUT /api/admin/announcements ─────────────────────────────────────────────

/**
 * Edit pengumuman yang sudah ada.
 * Body: { id: string, title?: string, body?: string, priority?: "normal" | "urgent" }
 * Hanya bisa diakses oleh admin.
 */
export async function PUT(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  // Verifikasi role admin
  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message: "Akses ditolak. Hanya admin yang dapat mengedit pengumuman.",
      },
      { status: 403 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request body harus berupa JSON yang valid.",
      },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request body tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  const {
    id,
    title,
    body: announcementBody,
    priority,
  } = body as Record<string, unknown>;

  // Validasi ID
  if (!id || typeof id !== "string" || !isValidUUID(id)) {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'id' wajib diisi dan harus berupa UUID yang valid.",
      },
      { status: 400 }
    );
  }

  // Validasi field yang akan diupdate (minimal satu harus ada)
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (title !== undefined) {
    if (typeof title !== "string" || title.trim() === "") {
      return NextResponse.json<AnnouncementErrorResponse>(
        {
          success: false,
          error: "validation_error",
          message: "Field 'title' tidak boleh kosong jika disertakan.",
        },
        { status: 400 }
      );
    }
    updates.title = title.trim();
  }

  if (announcementBody !== undefined) {
    if (typeof announcementBody !== "string" || announcementBody.trim() === "") {
      return NextResponse.json<AnnouncementErrorResponse>(
        {
          success: false,
          error: "validation_error",
          message: "Field 'body' tidak boleh kosong jika disertakan.",
        },
        { status: 400 }
      );
    }
    updates.body = announcementBody.trim();
  }

  if (priority !== undefined) {
    if (!isValidPriority(priority)) {
      return NextResponse.json<AnnouncementErrorResponse>(
        {
          success: false,
          error: "validation_error",
          message: "Field 'priority' harus bernilai 'normal' atau 'urgent'.",
        },
        { status: 400 }
      );
    }
    updates.priority = priority;
  }

  // Cek apakah pengumuman dengan ID tersebut ada
  const { data: existing, error: fetchError } = await supabase
    .from("announcements")
    .select("id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "not_found",
        message: "Pengumuman dengan ID tersebut tidak ditemukan.",
      },
      { status: 404 }
    );
  }

  // Update pengumuman
  const { data, error } = await supabase
    .from("announcements")
    .update(updates)
    .eq("id", id)
    .select("id, title, body, priority, created_by, created_at, updated_at")
    .single();

  if (error || !data) {
    console.error("[PUT /api/admin/announcements] Supabase error:", error?.message);
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat memperbarui pengumuman.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json<AnnouncementResponse>(
    { success: true, data },
    { status: 200 }
  );
}

// ─── DELETE /api/admin/announcements ──────────────────────────────────────────

/**
 * Hapus pengumuman berdasarkan ID.
 * Query param: ?id=<uuid>
 * Hanya bisa diakses oleh admin.
 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  // Verifikasi role admin
  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message: "Akses ditolak. Hanya admin yang dapat menghapus pengumuman.",
      },
      { status: 403 }
    );
  }

  // Ambil ID dari query parameter
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id || !isValidUUID(id)) {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Query parameter 'id' wajib diisi dan harus berupa UUID yang valid.",
      },
      { status: 400 }
    );
  }

  // Cek apakah pengumuman dengan ID tersebut ada
  const { data: existing, error: fetchError } = await supabase
    .from("announcements")
    .select("id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "not_found",
        message: "Pengumuman dengan ID tersebut tidak ditemukan.",
      },
      { status: 404 }
    );
  }

  // Hapus pengumuman
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[DELETE /api/admin/announcements] Supabase error:", error.message);
    return NextResponse.json<AnnouncementErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat menghapus pengumuman.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json<AnnouncementDeleteResponse>(
    { success: true, message: "Pengumuman berhasil dihapus." },
    { status: 200 }
  );
}
