/**
 * API Route: /api/admin/gallery/photos
 *
 * Endpoint untuk pengelolaan foto galeri oleh admin.
 * Semua endpoint memerlukan autentikasi dan role 'admin'.
 *
 * GET    — ambil semua foto untuk album tertentu (?album_id=<uuid>)
 * POST   — upload foto ke album (multipart/form-data: album_id, file, caption?)
 *          Validasi server-side: hanya image/jpeg, image/png, image/webp; maks 5MB
 *          Upload ke Supabase Storage bucket "gallery" di path {album_id}/{uuid}.{ext}
 *          Record DB hanya disimpan jika Storage upload berhasil
 * DELETE — hapus foto berdasarkan ID (hapus dari Storage DAN DB)
 *
 * Requirements: 4.3, 4.6
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GalleryPhoto } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// ─── Response Types ───────────────────────────────────────────────────────────

interface PhotosListResponse {
  success: true;
  data: GalleryPhoto[];
}

interface PhotoResponse {
  success: true;
  data: GalleryPhoto;
}

interface PhotoDeleteResponse {
  success: true;
  message: string;
}

interface PhotoErrorResponse {
  success: false;
  error: string;
  message: string;
}

type ApiResponse = PhotosListResponse | PhotoResponse | PhotoDeleteResponse | PhotoErrorResponse;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function generateUUID(): string {
  // Gunakan crypto.randomUUID() yang tersedia di Node.js 14.17+
  return crypto.randomUUID();
}

function isAllowedMimeType(mimeType: string): mimeType is (typeof ALLOWED_MIME_TYPES)[number] {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
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

// ─── GET /api/admin/gallery/photos ───────────────────────────────────────────

/**
 * Ambil semua foto untuk album tertentu.
 * Query param: ?album_id=<uuid>
 * Hanya bisa diakses oleh admin.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  // Verifikasi role admin
  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message: "Akses ditolak. Hanya admin yang dapat mengakses endpoint ini.",
      },
      { status: 403 }
    );
  }

  // Ambil album_id dari query parameter
  const { searchParams } = new URL(request.url);
  const albumId = searchParams.get("album_id");

  if (!albumId || !isValidUUID(albumId)) {
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Query parameter 'album_id' wajib diisi dan harus berupa UUID yang valid.",
      },
      { status: 400 }
    );
  }

  // Ambil semua foto untuk album tersebut
  const { data: photos, error: photosError } = await supabase
    .from("gallery_photos")
    .select("id, album_id, url, caption, uploaded_by, created_at")
    .eq("album_id", albumId)
    .order("created_at", { ascending: true });

  if (photosError) {
    console.error("[GET /api/admin/gallery/photos] Supabase error:", photosError.message);
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat mengambil data foto.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json<PhotosListResponse>(
    { success: true, data: photos ?? [] },
    { status: 200 }
  );
}

// ─── POST /api/admin/gallery/photos ──────────────────────────────────────────

/**
 * Upload foto ke album galeri.
 * Content-Type: multipart/form-data
 * Fields: album_id (string UUID), file (File), caption (string, opsional)
 *
 * Validasi server-side:
 * - Hanya image/jpeg, image/png, image/webp
 * - Maksimal 5MB
 *
 * Upload ke Supabase Storage bucket "gallery" di path {album_id}/{uuid}.{ext}
 * Record DB hanya disimpan jika Storage upload berhasil.
 *
 * Hanya bisa diakses oleh admin.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  // Verifikasi role admin
  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message: "Akses ditolak. Hanya admin yang dapat mengupload foto.",
      },
      { status: 403 }
    );
  }

  // Parse multipart/form-data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request harus berupa multipart/form-data yang valid.",
      },
      { status: 400 }
    );
  }

  // Ambil field dari form data
  const albumId = formData.get("album_id");
  const file = formData.get("file");
  const caption = formData.get("caption");

  // Validasi album_id
  if (!albumId || typeof albumId !== "string" || !isValidUUID(albumId)) {
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'album_id' wajib diisi dan harus berupa UUID yang valid.",
      },
      { status: 400 }
    );
  }

  // Validasi file
  if (!file || !(file instanceof File)) {
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'file' wajib diisi dan harus berupa file gambar.",
      },
      { status: 400 }
    );
  }

  // Validasi MIME type (server-side)
  if (!isAllowedMimeType(file.type)) {
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: `Format file tidak didukung. Hanya menerima: ${ALLOWED_MIME_TYPES.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  // Validasi ukuran file (server-side, maks 5MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Ukuran file melebihi batas maksimal 5MB.",
      },
      { status: 400 }
    );
  }

  // Validasi caption (opsional)
  if (caption !== null && caption !== undefined && typeof caption !== "string") {
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'caption' harus berupa string jika disertakan.",
      },
      { status: 400 }
    );
  }

  // Cek apakah album dengan ID tersebut ada
  const { data: album, error: albumError } = await supabase
    .from("gallery_albums")
    .select("id")
    .eq("id", albumId)
    .single();

  if (albumError || !album) {
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "not_found",
        message: "Album dengan ID tersebut tidak ditemukan.",
      },
      { status: 404 }
    );
  }

  // Buat path Storage: {album_id}/{uuid}.{ext}
  const ext = MIME_TO_EXT[file.type];
  const uuid = generateUUID();
  const storagePath = `${albumId}/${uuid}.${ext}`;

  // Upload ke Supabase Storage menggunakan admin client (bypass RLS)
  const adminClient = createAdminClient();
  const fileBuffer = await file.arrayBuffer();

  const { error: storageError } = await adminClient.storage
    .from("gallery")
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (storageError) {
    console.error("[POST /api/admin/gallery/photos] Storage upload error:", storageError.message);
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "storage_error",
        message: "Gagal mengupload foto ke storage. Silakan coba lagi.",
      },
      { status: 500 }
    );
  }

  // Storage upload berhasil — simpan record ke DB
  const { data: photo, error: dbError } = await supabase
    .from("gallery_photos")
    .insert({
      album_id: albumId,
      url: storagePath,
      caption: caption ? (caption as string).trim() : null,
      uploaded_by: admin.userId,
    })
    .select("id, album_id, url, caption, uploaded_by, created_at")
    .single();

  if (dbError || !photo) {
    console.error("[POST /api/admin/gallery/photos] DB insert error:", dbError?.message);

    // Rollback: hapus file dari Storage karena DB insert gagal
    await adminClient.storage.from("gallery").remove([storagePath]);

    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat menyimpan data foto.",
      },
      { status: 500 }
    );
  }

  // Auto-set cover_url album jika belum ada cover (foto pertama = cover otomatis)
  const { data: albumData } = await supabase
    .from("gallery_albums")
    .select("cover_url")
    .eq("id", albumId)
    .single();

  if (albumData && !albumData.cover_url) {
    await supabase
      .from("gallery_albums")
      .update({ cover_url: storagePath })
      .eq("id", albumId);
  }

  return NextResponse.json<PhotoResponse>(
    { success: true, data: photo },
    { status: 201 }
  );
}

// ─── DELETE /api/admin/gallery/photos ────────────────────────────────────────

/**
 * Hapus foto berdasarkan ID.
 * Menghapus file dari Supabase Storage DAN record dari DB.
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
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message: "Akses ditolak. Hanya admin yang dapat menghapus foto.",
      },
      { status: 403 }
    );
  }

  // Ambil ID dari query parameter
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id || !isValidUUID(id)) {
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Query parameter 'id' wajib diisi dan harus berupa UUID yang valid.",
      },
      { status: 400 }
    );
  }

  // Ambil data foto untuk mendapatkan path Storage
  const { data: photo, error: fetchError } = await supabase
    .from("gallery_photos")
    .select("id, url")
    .eq("id", id)
    .single();

  if (fetchError || !photo) {
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "not_found",
        message: "Foto dengan ID tersebut tidak ditemukan.",
      },
      { status: 404 }
    );
  }

  // Hapus file dari Supabase Storage menggunakan admin client
  const adminClient = createAdminClient();
  const { error: storageError } = await adminClient.storage
    .from("gallery")
    .remove([photo.url]);

  if (storageError) {
    // Log error tapi lanjutkan penghapusan DB record
    console.error(
      "[DELETE /api/admin/gallery/photos] Storage removal error:",
      storageError.message
    );
  }

  // Hapus record dari DB
  const { error: deleteError } = await supabase
    .from("gallery_photos")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("[DELETE /api/admin/gallery/photos] DB delete error:", deleteError.message);
    return NextResponse.json<PhotoErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat menghapus foto.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json<PhotoDeleteResponse>(
    { success: true, message: "Foto berhasil dihapus." },
    { status: 200 }
  );
}
