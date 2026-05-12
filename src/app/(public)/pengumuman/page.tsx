import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Announcement } from "@/types";

/**
 * Halaman daftar semua pengumuman publik.
 * ISR dengan revalidate 60 detik.
 */
export const revalidate = 60;

export const metadata = {
  title: "Pengumuman — Portal Warga Bukit Pandawa",
  description: "Daftar pengumuman dari pengurus perumahan Bukit Pandawa.",
};

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function getAllAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, priority, created_by, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[pengumuman] Error fetching announcements:", error.message);
    return [];
  }

  return data ?? [];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AnnouncementIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
      />
    </svg>
  );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      {/* Header: badge + tanggal */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge priority={announcement.priority} />
        <time
          dateTime={announcement.created_at}
          className="text-xs text-gray-400"
        >
          {formatDate(announcement.created_at)}
        </time>
        {announcement.updated_at && (
          <span className="text-xs text-gray-400">
            · Diperbarui {formatDateTime(announcement.updated_at)}
          </span>
        )}
      </div>

      {/* Judul */}
      <h2 className="mb-2 text-base font-semibold leading-snug text-brand-black">
        {announcement.title}
      </h2>

      {/* Isi — whitespace preserved, line breaks respected */}
      <div className="prose prose-sm max-w-none text-gray-600">
        <p className="whitespace-pre-wrap leading-relaxed">
          {announcement.body}
        </p>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PengumumanPage() {
  const announcements = await getAllAnnouncements();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-black sm:text-2xl">
          Pengumuman
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Informasi terbaru dari pengurus perumahan Bukit Pandawa.
        </p>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {announcements.length === 0 && (
        <EmptyState
          title="Belum ada pengumuman"
          description="Pengumuman dari pengurus perumahan akan muncul di sini."
          icon={<AnnouncementIcon />}
        />
      )}

      {/* ── Daftar pengumuman ───────────────────────────────────────── */}
      {announcements.length > 0 && (
        <ul className="space-y-4" role="list" aria-label="Daftar pengumuman">
          {announcements.map((announcement) => (
            <li key={announcement.id}>
              <AnnouncementCard announcement={announcement} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
