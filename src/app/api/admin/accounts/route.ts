/**
 * API Route: /api/admin/accounts
 *
 * Endpoint untuk pengelolaan akun ketua gang oleh admin.
 * Semua endpoint hanya bisa diakses oleh role 'admin'.
 *
 * GET   — list semua akun ketua gang
 * POST  — buat akun ketua gang baru via Supabase Admin API
 * PATCH — reset password atau nonaktifkan akun
 *
 * Requirements: 4.6
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, UserRole } from "@/types";

// ─── Request / Response Types ─────────────────────────────────────────────────

interface AccountsListResponse {
  success: true;
  data: Profile[];
}

interface AccountResponse {
  success: true;
  data: Profile;
}

interface AccountMessageResponse {
  success: true;
  message: string;
}

interface AccountErrorResponse {
  success: false;
  error: string;
  message: string;
}

type ApiResponse =
  | AccountsListResponse
  | AccountResponse
  | AccountMessageResponse
  | AccountErrorResponse;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Verifikasi bahwa request berasal dari user yang terautentikasi dengan role 'admin'.
 * Mengembalikan user ID jika valid, atau null jika tidak.
 */
async function verifyAdminRole(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ userId: string } | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

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

// ─── GET /api/admin/accounts ──────────────────────────────────────────────────

/**
 * Ambil semua akun ketua gang, diurutkan dari yang terbaru.
 * Hanya bisa diakses oleh admin.
 */
export async function GET(
  _request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message:
          "Akses ditolak. Hanya admin yang dapat mengakses endpoint ini.",
      },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, role, gang, created_at")
    .eq("role", "ketua_gang")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/admin/accounts] Supabase error:", error.message);
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat mengambil data akun.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json<AccountsListResponse>(
    { success: true, data: (data ?? []) as Profile[] },
    { status: 200 }
  );
}

// ─── POST /api/admin/accounts ─────────────────────────────────────────────────

/**
 * Buat akun ketua gang baru via Supabase Admin API.
 * Body: { name: string, email: string, password: string, gang: string }
 * Hanya bisa diakses oleh admin.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message: "Akses ditolak. Hanya admin yang dapat membuat akun.",
      },
      { status: 403 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request body harus berupa JSON yang valid.",
      },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request body tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  const { name, email, password, gang } = body as Record<string, unknown>;

  // Validasi name
  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'name' wajib diisi dan tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  // Validasi email
  if (!email || typeof email !== "string" || !isValidEmail(email.trim())) {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'email' wajib diisi dan harus berupa alamat email yang valid.",
      },
      { status: 400 }
    );
  }

  // Validasi password
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'password' wajib diisi dan minimal 8 karakter.",
      },
      { status: 400 }
    );
  }

  // Validasi gang
  if (!gang || typeof gang !== "string" || gang.trim() === "") {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'gang' wajib diisi untuk akun ketua gang.",
      },
      { status: 400 }
    );
  }

  // Gunakan service role client untuk buat user via Admin API
  const adminClient = createAdminClient();

  const { data: newUser, error: createError } =
    await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true, // Langsung konfirmasi email tanpa verifikasi
    });

  if (createError || !newUser.user) {
    console.error(
      "[POST /api/admin/accounts] Create user error:",
      createError?.message
    );

    // Tangani error email sudah terdaftar
    if (createError?.message?.toLowerCase().includes("already registered")) {
      return NextResponse.json<AccountErrorResponse>(
        {
          success: false,
          error: "email_taken",
          message: "Email tersebut sudah terdaftar. Gunakan email lain.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat membuat akun.",
      },
      { status: 500 }
    );
  }

  // Insert profil ke tabel profiles
  const { data: newProfile, error: profileError } = await adminClient
    .from("profiles")
    .insert({
      id: newUser.user.id,
      name: name.trim(),
      role: "ketua_gang" as UserRole,
      gang: gang.trim(),
    })
    .select("id, name, role, gang, created_at")
    .single();

  if (profileError || !newProfile) {
    console.error(
      "[POST /api/admin/accounts] Profile insert error:",
      profileError?.message
    );
    // Hapus user auth yang sudah dibuat agar tidak ada orphan
    await adminClient.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat menyimpan profil akun.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json<AccountResponse>(
    { success: true, data: newProfile as Profile },
    { status: 201 }
  );
}

// ─── PATCH /api/admin/accounts ────────────────────────────────────────────────

/**
 * Reset password atau nonaktifkan akun ketua gang.
 * Body: { id: string, action: "reset_password" | "disable", new_password?: string }
 * Hanya bisa diakses oleh admin.
 *
 * action = "reset_password": update password user
 * action = "disable": ban user via Supabase Admin API
 */
export async function PATCH(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message: "Akses ditolak. Hanya admin yang dapat mengubah akun.",
      },
      { status: 403 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request body harus berupa JSON yang valid.",
      },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request body tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  const { id, action, new_password } = body as Record<string, unknown>;

  // Validasi ID
  if (!id || typeof id !== "string" || !isValidUUID(id)) {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'id' wajib diisi dan harus berupa UUID yang valid.",
      },
      { status: 400 }
    );
  }

  // Validasi action
  if (action !== "reset_password" && action !== "disable") {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message:
          "Field 'action' harus bernilai 'reset_password' atau 'disable'.",
      },
      { status: 400 }
    );
  }

  // Cek akun ada dan role-nya ketua_gang
  const { data: targetProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .single();

  if (fetchError || !targetProfile) {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "not_found",
        message: "Akun dengan ID tersebut tidak ditemukan.",
      },
      { status: 404 }
    );
  }

  if (targetProfile.role !== "ketua_gang") {
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "forbidden",
        message: "Hanya akun ketua gang yang dapat dimodifikasi via endpoint ini.",
      },
      { status: 403 }
    );
  }

  const adminClient = createAdminClient();

  if (action === "reset_password") {
    // Validasi new_password
    if (
      !new_password ||
      typeof new_password !== "string" ||
      new_password.length < 8
    ) {
      return NextResponse.json<AccountErrorResponse>(
        {
          success: false,
          error: "validation_error",
          message:
            "Field 'new_password' wajib diisi dan minimal 8 karakter untuk reset password.",
        },
        { status: 400 }
      );
    }

    const { error: resetError } = await adminClient.auth.admin.updateUserById(
      id,
      { password: new_password }
    );

    if (resetError) {
      console.error(
        "[PATCH /api/admin/accounts] Reset password error:",
        resetError.message
      );
      return NextResponse.json<AccountErrorResponse>(
        {
          success: false,
          error: "server_error",
          message: "Terjadi kesalahan saat mereset password.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json<AccountMessageResponse>(
      { success: true, message: "Password berhasil direset." },
      { status: 200 }
    );
  }

  // action === "disable"
  const { error: banError } = await adminClient.auth.admin.updateUserById(id, {
    ban_duration: "876600h", // ~100 tahun = nonaktif permanen
  });

  if (banError) {
    console.error(
      "[PATCH /api/admin/accounts] Disable account error:",
      banError.message
    );
    return NextResponse.json<AccountErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat menonaktifkan akun.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json<AccountMessageResponse>(
    { success: true, message: "Akun berhasil dinonaktifkan." },
    { status: 200 }
  );
}
