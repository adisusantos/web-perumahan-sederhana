import React from "react";
import type { PollStatus, AnnouncementPriority } from "@/types";

// ─── Variant definitions ─────────────────────────────────────────────────────

type BadgeVariant =
  | "poll-active"
  | "poll-closed"
  | "priority-normal"
  | "priority-urgent";

const variantClasses: Record<BadgeVariant, string> = {
  "poll-active":
    "bg-green-100 text-green-800 border border-green-200",
  "poll-closed":
    "bg-gray-100 text-gray-600 border border-gray-200",
  "priority-normal":
    "bg-blue-50 text-blue-700 border border-blue-200",
  "priority-urgent":
    "bg-red-100 text-red-700 border border-red-200",
};

const variantLabels: Record<BadgeVariant, string> = {
  "poll-active": "Aktif",
  "poll-closed": "Selesai",
  "priority-normal": "Normal",
  "priority-urgent": "Urgent",
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface BadgeBaseProps {
  className?: string;
  /** Label kustom — jika tidak diisi, menggunakan label default variant */
  label?: string;
}

interface PollStatusBadgeProps extends BadgeBaseProps {
  /** Status poll dari tipe PollStatus */
  pollStatus: PollStatus;
  priority?: never;
}

interface PriorityBadgeProps extends BadgeBaseProps {
  /** Prioritas pengumuman dari tipe AnnouncementPriority */
  priority: AnnouncementPriority;
  pollStatus?: never;
}

export type BadgeProps = PollStatusBadgeProps | PriorityBadgeProps;

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Komponen badge untuk menampilkan status poll dan prioritas pengumuman.
 *
 * Penggunaan:
 * ```tsx
 * // Status poll
 * <Badge pollStatus="active" />
 * <Badge pollStatus="closed" />
 *
 * // Prioritas pengumuman
 * <Badge priority="normal" />
 * <Badge priority="urgent" />
 * ```
 *
 * Accessible: menggunakan role="status" dan aria-label yang deskriptif.
 */
export function Badge({ className = "", label, ...props }: BadgeProps) {
  let variant: BadgeVariant;
  let ariaLabel: string;

  if ("pollStatus" in props && props.pollStatus !== undefined) {
    variant = props.pollStatus === "active" ? "poll-active" : "poll-closed";
    ariaLabel = `Status poll: ${variantLabels[variant]}`;
  } else {
    const priority = (props as PriorityBadgeProps).priority;
    variant = priority === "urgent" ? "priority-urgent" : "priority-normal";
    ariaLabel = `Prioritas: ${variantLabels[variant]}`;
  }

  const displayLabel = label ?? variantLabels[variant];

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Dot indikator untuk variant aktif/urgent */}
      {(variant === "poll-active" || variant === "priority-urgent") && (
        <span
          aria-hidden="true"
          className={[
            "h-1.5 w-1.5 rounded-full",
            variant === "poll-active" ? "bg-green-500" : "bg-red-500",
          ].join(" ")}
        />
      )}
      {displayLabel}
    </span>
  );
}

export default Badge;
