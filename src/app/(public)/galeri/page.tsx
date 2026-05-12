import React from "react";
import { createClient } from "@/lib/supabase/server";
import type { GalleryAlbum, GalleryPhoto } from "@/types";
import { GaleriClient } from "./GaleriClient";

/**
 * ISR: revalidate setiap 60 detik.
 * Foto galeri jarang berubah, tapi tetap perlu segar setelah admin upload.
 * Requirements: 4.3
 */
export const revalidate = 60;

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata = {
  title: "Galeri — Portal Warga Bukit Pandawa",
  description:
    "Dokumentasi foto acara dan kegiatan perumahan Bukit Pandawa, Godean Jogja Hills.",
};

// ─── Data Fetching ────────────────────────────────────────────────────────────

/**
 * Fetch semua album galeri dari Supabase, diurutkan dari terbaru.
 */
async function fetchAlbums(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<GalleryAlbum[]> {
  const { data, error } = await supabase
    .from("gallery_albums")
    .select("id, name, description, cover_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[galeri] Gagal fetch albums:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Fetch semua foto untuk daftar album yang diberikan.
 * Mengembalikan map album_id → GalleryPhoto[].
 */
async function fetchPhotosByAlbum(
  supabase: Awaited<ReturnType<typeof createClient>>,
  albumIds: string[]
): Promise<Record<string, GalleryPhoto[]>> {
  if (albumIds.length === 0) return {};

  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, album_id, url, caption, uploaded_by, created_at")
    .in("album_id", albumIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[galeri] Gagal fetch photos:", error.message);
    return {};
  }

  // Kelompokkan foto per album_id
  const map: Record<string, GalleryPhoto[]> = {};
  for (const photo of data ?? []) {
    if (!map[photo.album_id]) {
      map[photo.album_id] = [];
    }
    map[photo.album_id].push(photo);
  }

  return map;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Halaman galeri foto portal warga Bukit Pandawa.
 *
 * - Server Component: fetch album dan foto dari Supabase
 * - ISR dengan revalidate: 60 detik
 * - Meneruskan data ke `GaleriClient` untuk interaktivitas (pilih album, lightbox)
 *
 * Requirements: 4.3
 */
export default async function GaleriPage() {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  // Fetch albums terlebih dahulu
  const albums = await fetchAlbums(supabase);

  // Fetch semua foto untuk semua album sekaligus (1 query, bukan N+1)
  const albumIds = albums.map((a) => a.id);
  const rawPhotosByAlbum = await fetchPhotosByAlbum(supabase, albumIds);

  // Konversi path relatif ke full Supabase Storage URL
  const photosByAlbum: Record<string, GalleryPhoto[]> = {};
  for (const [albumId, photos] of Object.entries(rawPhotosByAlbum)) {
    photosByAlbum[albumId] = photos.map((photo) => ({
      ...photo,
      url: photo.url.startsWith("http")
        ? photo.url
        : `${supabaseUrl}/storage/v1/object/public/gallery/${photo.url}`,
    }));
  }

  // Konversi cover_url album juga jika ada, atau fallback ke foto pertama album
  const normalizedAlbums: GalleryAlbum[] = albums.map((album) => {
    // Cari foto pertama dari album ini sebagai fallback cover
    const firstPhoto = rawPhotosByAlbum[album.id]?.[0];
    const fallbackPath = firstPhoto?.url ?? null;

    // Tentukan cover path: pakai cover_url jika ada, fallback ke foto pertama
    const coverPath = album.cover_url ?? fallbackPath;

    return {
      ...album,
      cover_url: coverPath
        ? coverPath.startsWith("http")
          ? coverPath
          : `${supabaseUrl}/storage/v1/object/public/gallery/${coverPath}`
        : null,
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* ── Judul halaman ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-black sm:text-2xl">
          Galeri
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Dokumentasi foto acara dan kegiatan perumahan Bukit Pandawa
        </p>
      </div>

      {/* ── Konten interaktif (Client Component) ─────────────────────── */}
      <GaleriClient albums={normalizedAlbums} photosByAlbum={photosByAlbum} />
    </div>
  );
}
