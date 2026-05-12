/**
 * API Route: /api/admin/gallery/albums
 *
 * Endpoint untuk pengelolaan album galeri oleh admin.
 * Semua endpoint memerlukan autentikasi dan role 'admin'.
 *
 * GET    — ambil semua album beserta foto-fotonya
 * POST   — buat album baru (name wajib, description & cover_url opsional)
 * DELETE — hapus album berdasarkan ID (juga menghapus semua foto dari Storage)
 *
 * Requirements: 4.3, 4.6
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GalleryAlbum } from "@/types";

// ─── Response Types ───────────────────────────────────────────────────────────

interface AlbumWithPhotos extends GalleryAlbum {
  photos: import("@/types").GalleryPhoto[];
}

interface AlbumsListResponse {
  success: true;
  data: AlbumWithPhotos[];
}

interface AlbumResponse {
  success: true;
  data: GalleryAlbum;
}

interface AlbumDeleteResponse {
  success: true;
  message: string;
}

interface AlbumErrorResponse {
  success: false;
  error: string;
  message: string;
}

type ApiResponse = AlbumsListResponse | AlbumResponse | AlbumDeleteResponse | AlbumErrorResponse;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── GET /api/admin/gallery/albums ───────────────────────────────────────────

/**
 * Ambil semua album beserta foto-fotonya, diurutkan dari yang terbaru.
 * Hanya bisa diakses oleh admin.
 */
export async function GET(
  _request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  // Verifikasi role admin
  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<AlbumErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message: "Akses ditolak. Hanya admin yang dapat mengakses endpoint ini.",
      },
      { status: 403 }
    );
  }

  // Ambil semua album
  const { data: albums, error: albumsError } = await supabase
    .from("gallery_albums")
    .select("id, name, description, cover_url, created_at")
    .order("created_at", { ascending: false });

  if (albumsError) {
    console.error("[GET /api/admin/gallery/albums] Supabase error:", albumsError.message);
    return NextResponse.json<AlbumErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat mengambil data album.",
      },
      { status: 500 }
    );
  }

  // Ambil semua foto untuk album-album tersebut
  const albumIds = (albums ?? []).map((a) => a.id);
  let photos: import("@/types").GalleryPhoto[] = [];

  if (albumIds.length > 0) {
    const { data: photosData, error: photosError } = await supabase
      .from("gallery_photos")
      .select("id, album_id, url, caption, uploaded_by, created_at")
      .in("album_id", albumIds)
      .order("created_at", { ascending: true });

    if (photosError) {
      console.error("[GET /api/admin/gallery/albums] Photos error:", photosError.message);
      // Lanjutkan dengan foto kosong daripada gagal total
    } else {
      photos = photosData ?? [];
    }
  }

  // Gabungkan foto ke album masing-masing
  const albumsWithPhotos: AlbumWithPhotos[] = (albums ?? []).map((album) => ({
    ...album,
    photos: photos.filter((p) => p.album_id === album.id),
  }));

  return NextResponse.json<AlbumsListResponse>(
    { success: true, data: albumsWithPhotos },
    { status: 200 }
  );
}

// ─── POST /api/admin/gallery/albums ──────────────────────────────────────────

/**
 * Buat album galeri baru.
 * Body: { name: string, description?: string, cover_url?: string }
 * Hanya bisa diakses oleh admin.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const supabase = await createClient();

  // Verifikasi role admin
  const admin = await verifyAdminRole(supabase);
  if (!admin) {
    return NextResponse.json<AlbumErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message: "Akses ditolak. Hanya admin yang dapat membuat album.",
      },
      { status: 403 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AlbumErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request body harus berupa JSON yang valid.",
      },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json<AlbumErrorResponse>(
      {
        success: false,
        error: "invalid_request",
        message: "Request body tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  const { name, description, cover_url } = body as Record<string, unknown>;

  // Validasi field wajib
  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json<AlbumErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'name' wajib diisi dan tidak boleh kosong.",
      },
      { status: 400 }
    );
  }

  // Validasi field opsional
  if (description !== undefined && description !== null && typeof description !== "string") {
    return NextResponse.json<AlbumErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'description' harus berupa string jika disertakan.",
      },
      { status: 400 }
    );
  }

  if (cover_url !== undefined && cover_url !== null && typeof cover_url !== "string") {
    return NextResponse.json<AlbumErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Field 'cover_url' harus berupa string jika disertakan.",
      },
      { status: 400 }
    );
  }

  // Insert album baru
  const { data, error } = await supabase
    .from("gallery_albums")
    .insert({
      name: name.trim(),
      description: description ? (description as string).trim() : null,
      cover_url: cover_url ? (cover_url as string).trim() : null,
    })
    .select("id, name, description, cover_url, created_at")
    .single();

  if (error || !data) {
    console.error("[POST /api/admin/gallery/albums] Supabase error:", error?.message);
    return NextResponse.json<AlbumErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat menyimpan album.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json<AlbumResponse>(
    { success: true, data },
    { status: 201 }
  );
}

// ─── DELETE /api/admin/gallery/albums ────────────────────────────────────────

/**
 * Hapus album berdasarkan ID.
 * Juga menghapus semua foto dalam album dari Supabase Storage.
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
    return NextResponse.json<AlbumErrorResponse>(
      {
        success: false,
        error: "unauthorized",
        message: "Akses ditolak. Hanya admin yang dapat menghapus album.",
      },
      { status: 403 }
    );
  }

  // Ambil ID dari query parameter
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id || !isValidUUID(id)) {
    return NextResponse.json<AlbumErrorResponse>(
      {
        success: false,
        error: "validation_error",
        message: "Query parameter 'id' wajib diisi dan harus berupa UUID yang valid.",
      },
      { status: 400 }
    );
  }

  // Cek apakah album dengan ID tersebut ada
  const { data: existing, error: fetchError } = await supabase
    .from("gallery_albums")
    .select("id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json<AlbumErrorResponse>(
      {
        success: false,
        error: "not_found",
        message: "Album dengan ID tersebut tidak ditemukan.",
      },
      { status: 404 }
    );
  }

  // Ambil semua foto dalam album untuk dihapus dari Storage
  const { data: photos, error: photosError } = await supabase
    .from("gallery_photos")
    .select("id, url")
    .eq("album_id", id);

  if (photosError) {
    console.error("[DELETE /api/admin/gallery/albums] Error fetching photos:", photosError.message);
    return NextResponse.json<AlbumErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat mengambil data foto album.",
      },
      { status: 500 }
    );
  }

  // Hapus semua foto dari Supabase Storage jika ada
  if (photos && photos.length > 0) {
    const adminClient = createAdminClient();
    const storagePaths = photos.map((photo) => photo.url);

    const { error: storageError } = await adminClient.storage
      .from("gallery")
      .remove(storagePaths);

    if (storageError) {
      // Log error tapi lanjutkan — foto DB akan dihapus via CASCADE
      console.error(
        "[DELETE /api/admin/gallery/albums] Storage removal error:",
        storageError.message
      );
    }
  }

  // Hapus album (foto akan terhapus otomatis via ON DELETE CASCADE)
  const { error: deleteError } = await supabase
    .from("gallery_albums")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("[DELETE /api/admin/gallery/albums] Supabase error:", deleteError.message);
    return NextResponse.json<AlbumErrorResponse>(
      {
        success: false,
        error: "server_error",
        message: "Terjadi kesalahan saat menghapus album.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json<AlbumDeleteResponse>(
    { success: true, message: "Album dan semua fotonya berhasil dihapus." },
    { status: 200 }
  );
}
