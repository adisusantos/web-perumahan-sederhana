"use client";

import React from "react";
import Image from "next/image";
import type { GalleryPhoto } from "@/types";
import { EmptyState } from "@/components/ui/EmptyState";

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PhotoGridProps {
  /** Daftar foto dalam album yang akan ditampilkan */
  photos: GalleryPhoto[];
  /** Callback saat foto diklik — menerima index foto yang dipilih */
  onPhotoClick: (index: number) => void;
  /** Nama album untuk label aksesibilitas */
  albumName?: string;
  /** Class tambahan untuk container grid */
  className?: string;
}

// ─── PhotoThumbnail ───────────────────────────────────────────────────────────

interface PhotoThumbnailProps {
  photo: GalleryPhoto;
  index: number;
  onClick: (index: number) => void;
}

function PhotoThumbnail({ photo, index, onClick }: PhotoThumbnailProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(index)}
      className={[
        // Layout
        "group relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100",
        // Interaksi
        "cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:ring-2 hover:ring-brand-green/40 hover:ring-offset-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2",
        "active:scale-[0.97]",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={
        photo.caption
          ? `Lihat foto: ${photo.caption}`
          : `Lihat foto ${index + 1}`
      }
    >
      {/* Gambar menggunakan next/image untuk optimasi otomatis */}
      <Image
        src={photo.url}
        alt={photo.caption ?? `Foto ${index + 1}`}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />

      {/* Overlay dengan caption saat hover */}
      {photo.caption && (
        <div
          className={[
            "absolute inset-x-0 bottom-0 translate-y-full",
            "bg-gradient-to-t from-black/70 to-transparent",
            "px-2 pb-2 pt-6",
            "transition-transform duration-200 group-hover:translate-y-0",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        >
          <p className="line-clamp-2 text-xs text-white leading-snug">
            {photo.caption}
          </p>
        </div>
      )}

      {/* Ikon zoom saat hover */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        aria-hidden="true"
      >
        <div className="rounded-full bg-black/40 p-2 backdrop-blur-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="white"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        </div>
      </div>
    </button>
  );
}

// ─── PhotoGrid ────────────────────────────────────────────────────────────────

/**
 * Komponen grid foto dalam album galeri.
 *
 * Menampilkan foto dalam layout grid responsif menggunakan `next/image`
 * untuk optimasi gambar otomatis (lazy loading, WebP conversion, dll).
 *
 * Mobile-first: 2 kolom di mobile, 3 di tablet, 4 di desktop.
 *
 * - Setiap foto adalah `<button>` yang bisa diklik untuk membuka lightbox
 * - Caption ditampilkan sebagai overlay saat hover
 * - Accessible: aria-label deskriptif untuk setiap foto
 *
 * @example
 * ```tsx
 * <PhotoGrid
 *   photos={photos}
 *   albumName="Acara 17 Agustus"
 *   onPhotoClick={(index) => setLightboxIndex(index)}
 * />
 * ```
 */
export function PhotoGrid({
  photos,
  onPhotoClick,
  albumName,
  className = "",
}: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <EmptyState
        title="Belum ada foto"
        description="Foto dalam album ini akan muncul di sini."
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-7 w-7"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
            />
          </svg>
        }
        className={className}
      />
    );
  }

  return (
    <section
      aria-label={albumName ? `Foto dalam album ${albumName}` : "Foto album"}
      className={className}
    >
      <ul
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 sm:gap-3"
        role="list"
      >
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <PhotoThumbnail
              photo={photo}
              index={index}
              onClick={onPhotoClick}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default PhotoGrid;
