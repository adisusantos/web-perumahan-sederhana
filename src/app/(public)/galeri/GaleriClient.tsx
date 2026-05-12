"use client";

import React, { useState, useCallback } from "react";
import { AlbumGrid } from "@/components/gallery/AlbumGrid";
import { PhotoGrid } from "@/components/gallery/PhotoGrid";
import { Lightbox } from "@/components/gallery/Lightbox";
import type { GalleryAlbum, GalleryPhoto } from "@/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface GaleriClientProps {
  /** Daftar album yang di-fetch oleh Server Component */
  albums: GalleryAlbum[];
  /** Map album_id → daftar foto, di-fetch oleh Server Component */
  photosByAlbum: Record<string, GalleryPhoto[]>;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Client Component untuk halaman galeri.
 *
 * Mengelola semua state interaktif:
 * - Album yang sedang dipilih (null = tampilkan grid album)
 * - Index foto yang terbuka di lightbox (null = lightbox tertutup)
 *
 * Server Component (`page.tsx`) fetch data, lalu meneruskannya ke sini
 * sebagai props agar halaman tetap bisa di-ISR.
 *
 * Requirements: 4.3
 */
export function GaleriClient({ albums, photosByAlbum }: GaleriClientProps) {
  // Album yang sedang dibuka (null = tampilkan daftar album)
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);

  // Index foto yang terbuka di lightbox (null = lightbox tertutup)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Foto dalam album yang sedang dipilih
  const currentPhotos: GalleryPhoto[] = selectedAlbum
    ? (photosByAlbum[selectedAlbum.id] ?? [])
    : [];

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAlbumClick = useCallback((album: GalleryAlbum) => {
    setSelectedAlbum(album);
    setLightboxIndex(null);
  }, []);

  const handlePhotoClick = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const handleLightboxClose = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const handleLightboxNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? Math.min(prev + 1, currentPhotos.length - 1) : null
    );
  }, [currentPhotos.length]);

  const handleLightboxPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? Math.max(prev - 1, 0) : null
    );
  }, []);

  const handleBackToAlbums = useCallback(() => {
    setSelectedAlbum(null);
    setLightboxIndex(null);
  }, []);

  // ── Render: tampilan foto dalam album ─────────────────────────────────────

  if (selectedAlbum) {
    return (
      <>
        {/* Breadcrumb / tombol kembali */}
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleBackToAlbums}
            className={[
              "flex items-center gap-1.5 rounded-lg px-3 py-2",
              "text-sm font-medium text-brand-green",
              "transition-colors duration-150",
              "hover:bg-brand-green/10",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2",
              "active:bg-brand-green/20",
            ].join(" ")}
            aria-label="Kembali ke daftar album"
          >
            {/* Ikon panah kiri */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            Semua Album
          </button>

          {/* Separator */}
          <span className="text-gray-300" aria-hidden="true">/</span>

          {/* Nama album aktif */}
          <span className="text-sm font-semibold text-brand-black line-clamp-1">
            {selectedAlbum.name}
          </span>
        </div>

        {/* Deskripsi album (opsional) */}
        {selectedAlbum.description && (
          <p className="mb-4 text-sm text-gray-500 leading-relaxed">
            {selectedAlbum.description}
          </p>
        )}

        {/* Grid foto */}
        <PhotoGrid
          photos={currentPhotos}
          albumName={selectedAlbum.name}
          onPhotoClick={handlePhotoClick}
        />

        {/* Lightbox */}
        <Lightbox
          photos={currentPhotos}
          currentIndex={lightboxIndex}
          onClose={handleLightboxClose}
          onNext={handleLightboxNext}
          onPrev={handleLightboxPrev}
        />
      </>
    );
  }

  // ── Render: daftar album ───────────────────────────────────────────────────

  return (
    <AlbumGrid albums={albums} onAlbumClick={handleAlbumClick} />
  );
}
