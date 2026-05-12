"use client";

import React from "react";
import Image from "next/image";
import type { GalleryAlbum } from "@/types";
import { EmptyState } from "@/components/ui/EmptyState";

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AlbumGridProps {
  /** Daftar album galeri yang akan ditampilkan */
  albums: GalleryAlbum[];
  /** Callback saat album diklik — menerima album yang dipilih */
  onAlbumClick: (album: GalleryAlbum) => void;
  /** Class tambahan untuk container grid */
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format tanggal ke format lokal Indonesia */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── AlbumCard ────────────────────────────────────────────────────────────────

interface AlbumCardProps {
  album: GalleryAlbum;
  onClick: (album: GalleryAlbum) => void;
}

function AlbumCard({ album, onClick }: AlbumCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(album)}
      className={[
        // Layout & sizing — touch target minimal 44px terpenuhi karena seluruh card bisa diklik
        "group relative flex flex-col overflow-hidden rounded-xl",
        "border border-gray-200 bg-white shadow-sm",
        // Interaksi
        "cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:border-brand-green/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2",
        "active:scale-[0.98]",
        // Aksesibilitas
        "text-left w-full",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`Buka album: ${album.name}`}
    >
      {/* Cover foto */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        {album.cover_url ? (
          <Image
            src={album.cover_url}
            alt={`Cover album ${album.name}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          /* Placeholder saat tidak ada cover */
          <div
            className="flex h-full w-full items-center justify-center bg-gray-100"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
              className="h-12 w-12 text-gray-300"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
          </div>
        )}

        {/* Overlay gradient saat hover */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden="true"
        />
      </div>

      {/* Info album */}
      <div className="flex flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-brand-black leading-snug">
          {album.name}
        </h3>
        {album.description && (
          <p className="line-clamp-2 text-xs text-gray-500 leading-relaxed">
            {album.description}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400">{formatDate(album.created_at)}</p>
      </div>
    </button>
  );
}

// ─── AlbumGrid ────────────────────────────────────────────────────────────────

/**
 * Komponen grid album galeri.
 *
 * Menampilkan daftar album dalam layout grid responsif dengan cover foto.
 * Mobile-first: 1 kolom di mobile, 2 di tablet, 3 di desktop.
 *
 * - Menggunakan `next/image` untuk optimasi gambar cover
 * - Accessible: setiap card adalah `<button>` dengan aria-label deskriptif
 * - Touch target minimal 44px terpenuhi (seluruh card bisa diklik)
 *
 * @example
 * ```tsx
 * <AlbumGrid
 *   albums={albums}
 *   onAlbumClick={(album) => setSelectedAlbum(album)}
 * />
 * ```
 */
export function AlbumGrid({ albums, onAlbumClick, className = "" }: AlbumGridProps) {
  if (albums.length === 0) {
    return (
      <EmptyState
        title="Belum ada album"
        description="Album foto acara perumahan akan muncul di sini."
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
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
        }
        className={className}
      />
    );
  }

  return (
    <section aria-label="Daftar album galeri" className={className}>
      <ul
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        role="list"
      >
        {albums.map((album) => (
          <li key={album.id}>
            <AlbumCard album={album} onClick={onAlbumClick} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AlbumGrid;
