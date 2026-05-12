import React from "react";

// ─── Default icons ────────────────────────────────────────────────────────────

/** Ikon default: kotak kosong dengan tanda tanya */
function DefaultIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  /** Judul utama yang ditampilkan */
  title: string;
  /** Deskripsi opsional di bawah judul */
  description?: string;
  /** Ikon kustom — jika tidak diisi, menggunakan ikon default */
  icon?: React.ReactNode;
  /** Tombol aksi opsional (misal: "Buat Poll Baru") */
  action?: React.ReactNode;
  /** Class tambahan untuk container */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Komponen tampilan kosong (empty state) untuk digunakan saat tidak ada data.
 *
 * Contoh penggunaan:
 * ```tsx
 * <EmptyState
 *   title="Belum ada pengumuman"
 *   description="Pengumuman dari pengurus perumahan akan muncul di sini."
 *   action={<Button variant="primary">Buat Pengumuman</Button>}
 * />
 * ```
 *
 * Accessible: menggunakan `role="status"` dan struktur heading yang benar.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className={[
        "flex flex-col items-center justify-center gap-4 rounded-xl",
        "border border-dashed border-gray-200 bg-gray-50",
        "px-6 py-12 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Ikon */}
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm"
        aria-hidden="true"
      >
        {icon ? (
          <span className="text-brand-green">{icon}</span>
        ) : (
          <DefaultIcon className="h-7 w-7 text-gray-400" />
        )}
      </div>

      {/* Teks */}
      <div className="space-y-1">
        <p className="text-base font-semibold text-brand-black">{title}</p>
        {description && (
          <p className="max-w-sm text-sm text-gray-500">{description}</p>
        )}
      </div>

      {/* Aksi opsional */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
