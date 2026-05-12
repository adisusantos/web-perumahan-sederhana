"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import type { Announcement, GalleryPhoto } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  activePollCount: number;
  latestAnnouncements: Pick<
    Announcement,
    "id" | "title" | "priority" | "created_at"
  >[];
  latestPhotos: Pick<GalleryPhoto, "id" | "url" | "caption" | "created_at">[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBar({
  stats,
}: {
  stats: { label: string; value: number; href: string }[];
}) {
  return (
    <div className="grid grid-cols-3 divide-x divide-gray-100 rounded-xl border border-gray-200 bg-white">
      {stats.map((s) => (
        <a
          key={s.label}
          href={s.href}
          className="flex flex-col items-center gap-0.5 px-3 py-4 text-center transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-green"
        >
          <span className="text-2xl font-bold text-brand-green">{s.value}</span>
          <span className="text-xs text-gray-500">{s.label}</span>
        </a>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Halaman dashboard admin — `/admin/dashboard`
 *
 * Menampilkan ringkasan:
 * - Jumlah poll aktif
 * - Pengumuman terbaru (maks. 3)
 * - Foto terbaru (maks. 4)
 *
 * Menu sidebar sudah dirender oleh `AdminLayout` (layout.tsx) sesuai role.
 *
 * Requirements: 4.6, 4.7
 */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient();

      try {
        // Jalankan semua query secara paralel
        const [pollsResult, announcementsResult, photosResult] =
          await Promise.all([
            // Hitung poll aktif
            supabase
              .from("polls")
              .select("id", { count: "exact", head: true })
              .eq("status", "active"),

            // Ambil 3 pengumuman terbaru
            supabase
              .from("announcements")
              .select("id, title, priority, created_at")
              .order("created_at", { ascending: false })
              .limit(3),

            // Ambil 4 foto terbaru
            supabase
              .from("gallery_photos")
              .select("id, url, caption, created_at")
              .order("created_at", { ascending: false })
              .limit(4),
          ]);

        if (pollsResult.error) throw pollsResult.error;
        if (announcementsResult.error) throw announcementsResult.error;
        if (photosResult.error) throw photosResult.error;

        setStats({
          activePollCount: pollsResult.count ?? 0,
          latestAnnouncements: announcementsResult.data ?? [],
          latestPhotos: (photosResult.data ?? []).map((photo) => ({
            ...photo,
            url: photo.url.startsWith("http")
              ? photo.url
              : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gallery/${photo.url}`,
          })),
        });
      } catch (err) {
        console.error("[AdminDashboard] Error loading stats:", err);
        setError("Gagal memuat data dashboard. Silakan muat ulang halaman.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Memuat data…</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-gray-100"
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-brand-black">Dashboard</h1>
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
        >
          {error}
        </div>
      </div>
    );
  }

  const { activePollCount, latestAnnouncements, latestPhotos } = stats!;

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ringkasan aktivitas Portal Warga Bukit Pandawa
        </p>
      </div>

      {/* ── Stat bar ────────────────────────────────────────────────── */}
      <StatBar
        stats={[
          { label: "Poll Aktif", value: activePollCount, href: "/admin/voting" },
          { label: "Pengumuman", value: latestAnnouncements.length, href: "/admin/pengumuman" },
          { label: "Foto", value: latestPhotos.length, href: "/admin/galeri" },
        ]}
      />

      {/* ── Latest announcements ────────────────────────────────────── */}
      <section aria-labelledby="announcements-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="announcements-heading"
            className="text-base font-semibold text-brand-black"
          >
            Pengumuman Terbaru
          </h2>
          <a
            href="/admin/pengumuman"
            className="text-sm font-medium text-brand-green hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-1 rounded"
          >
            Lihat semua
          </a>
        </div>

        {latestAnnouncements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
            <p className="text-sm text-gray-400">Belum ada pengumuman.</p>
          </div>
        ) : (
          <ul
            role="list"
            className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white"
          >
            {latestAnnouncements.map((ann) => (
              <li
                key={ann.id}
                className="flex items-start justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-black">
                    {ann.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatDate(ann.created_at)}
                  </p>
                </div>
                <Badge
                  priority={ann.priority}
                  className="shrink-0"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Latest photos ───────────────────────────────────────────── */}
      <section aria-labelledby="photos-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="photos-heading"
            className="text-base font-semibold text-brand-black"
          >
            Foto Terbaru
          </h2>
          <a
            href="/admin/galeri"
            className="text-sm font-medium text-brand-green hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-1 rounded"
          >
            Lihat semua
          </a>
        </div>

        {latestPhotos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
            <p className="text-sm text-gray-400">Belum ada foto yang diunggah.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {latestPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption ?? "Foto galeri"}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
                {photo.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <p className="truncate text-xs text-white">
                      {photo.caption}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
