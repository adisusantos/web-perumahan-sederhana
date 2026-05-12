"use client";

import React, { useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import type { GalleryPhoto } from "@/types";

// ─── Props ───────────────────────────────────────────────────────────────────

export interface LightboxProps {
  /** Daftar foto yang bisa dinavigasi */
  photos: GalleryPhoto[];
  /** Index foto yang sedang ditampilkan; `null` berarti lightbox tertutup */
  currentIndex: number | null;
  /** Callback untuk menutup lightbox */
  onClose: () => void;
  /** Callback untuk navigasi ke foto berikutnya */
  onNext: () => void;
  /** Callback untuk navigasi ke foto sebelumnya */
  onPrev: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Hook untuk focus trap di dalam modal.
 * Memastikan fokus keyboard tidak keluar dari elemen modal saat lightbox terbuka.
 */
function useFocusTrap(containerRef: React.RefObject<HTMLDivElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;

    // Selector untuk semua elemen yang bisa difokus
    const focusableSelector = [
      "button:not([disabled])",
      "a[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(", ");

    const getFocusableElements = () =>
      Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));

    // Simpan elemen yang difokus sebelum modal dibuka untuk dikembalikan saat tutup
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Fokus ke elemen pertama dalam modal
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: jika fokus di elemen pertama, pindah ke elemen terakhir
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: jika fokus di elemen terakhir, pindah ke elemen pertama
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      // Kembalikan fokus ke elemen sebelumnya saat modal ditutup
      previouslyFocused?.focus();
    };
  }, [isActive, containerRef]);
}

// ─── NavigationButton ─────────────────────────────────────────────────────────

interface NavButtonProps {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
  label: string;
}

function NavButton({ direction, onClick, disabled, label }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={[
        // Ukuran & posisi — touch target minimal 44px
        "flex h-11 w-11 items-center justify-center rounded-full",
        // Warna
        "bg-black/50 text-white backdrop-blur-sm",
        // Interaksi
        "transition-all duration-150",
        "hover:bg-black/70 hover:scale-110",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-black/50",
        "active:scale-95",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {direction === "prev" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5 8.25 12l7.5-7.5"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.25 4.5 7.5 7.5-7.5 7.5"
          />
        </svg>
      )}
    </button>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

/**
 * Komponen lightbox untuk menampilkan foto ukuran penuh.
 *
 * Fitur:
 * - Navigasi prev/next via tombol atau keyboard (ArrowLeft/ArrowRight)
 * - Tutup via tombol X, klik backdrop, atau tekan Escape
 * - Focus trap: fokus keyboard tidak keluar dari modal
 * - Accessible: aria-modal, aria-label, role="dialog"
 * - Mobile-first: tombol navigasi berukuran cukup untuk touch
 *
 * @example
 * ```tsx
 * const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
 *
 * <Lightbox
 *   photos={photos}
 *   currentIndex={lightboxIndex}
 *   onClose={() => setLightboxIndex(null)}
 *   onNext={() => setLightboxIndex(i => i !== null ? Math.min(i + 1, photos.length - 1) : null)}
 *   onPrev={() => setLightboxIndex(i => i !== null ? Math.max(i - 1, 0) : null)}
 * />
 * ```
 */
export function Lightbox({
  photos,
  currentIndex,
  onClose,
  onNext,
  onPrev,
}: LightboxProps) {
  const isOpen = currentIndex !== null;
  const containerRef = useRef<HTMLDivElement>(null);

  // Aktifkan focus trap saat lightbox terbuka
  useFocusTrap(containerRef, isOpen);

  // Cegah scroll body saat lightbox terbuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (currentIndex !== null && currentIndex > 0) {
            onPrev();
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (currentIndex !== null && currentIndex < photos.length - 1) {
            onNext();
          }
          break;
      }
    },
    [isOpen, currentIndex, photos.length, onClose, onNext, onPrev]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Jangan render apapun jika lightbox tertutup
  if (!isOpen || currentIndex === null) return null;

  const currentPhoto = photos[currentIndex];
  if (!currentPhoto) return null;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === photos.length - 1;
  const photoNumber = `${currentIndex + 1} / ${photos.length}`;

  return (
    /* Backdrop — klik di luar foto untuk menutup */
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        currentPhoto.caption
          ? `Foto: ${currentPhoto.caption}`
          : `Foto ${currentIndex + 1} dari ${photos.length}`
      }
      ref={containerRef}
      className={[
        // Posisi & ukuran
        "fixed inset-0 z-50",
        // Warna backdrop
        "bg-black/90 backdrop-blur-sm",
        // Layout
        "flex items-center justify-center",
        // Animasi masuk
        "animate-in fade-in duration-200",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(e) => {
        // Tutup hanya jika klik langsung di backdrop (bukan di konten)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Container konten — mencegah klik di sini menutup lightbox */}
      <div
        className="relative flex h-full w-full flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header: counter + tombol tutup ── */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6">
          {/* Counter foto */}
          <span
            className="rounded-full bg-black/50 px-3 py-1 text-sm text-white backdrop-blur-sm"
            aria-live="polite"
            aria-atomic="true"
          >
            {photoNumber}
          </span>

          {/* Tombol tutup */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup lightbox"
            className={[
              "flex h-11 w-11 items-center justify-center rounded-full",
              "bg-black/50 text-white backdrop-blur-sm",
              "transition-all duration-150",
              "hover:bg-black/70 hover:scale-110",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
              "active:scale-95",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ── Foto utama ── */}
        <div className="relative flex h-full w-full items-center justify-center px-16 py-16 sm:px-20">
          <div className="relative h-full w-full">
            <Image
              key={currentPhoto.id} // Re-render saat foto berubah
              src={currentPhoto.url}
              alt={currentPhoto.caption ?? `Foto ${currentIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              priority // Foto lightbox harus dimuat segera
              draggable={false}
            />
          </div>
        </div>

        {/* ── Caption ── */}
        {currentPhoto.caption && (
          <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4 sm:px-6 sm:pb-6">
            <p
              className={[
                "mx-auto max-w-2xl rounded-lg",
                "bg-black/60 px-4 py-2 backdrop-blur-sm",
                "text-center text-sm text-white leading-relaxed",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {currentPhoto.caption}
            </p>
          </div>
        )}

        {/* ── Tombol navigasi prev ── */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 sm:left-4">
          <NavButton
            direction="prev"
            onClick={onPrev}
            disabled={isFirst}
            label="Foto sebelumnya"
          />
        </div>

        {/* ── Tombol navigasi next ── */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 sm:right-4">
          <NavButton
            direction="next"
            onClick={onNext}
            disabled={isLast}
            label="Foto berikutnya"
          />
        </div>
      </div>
    </div>
  );
}

export default Lightbox;
