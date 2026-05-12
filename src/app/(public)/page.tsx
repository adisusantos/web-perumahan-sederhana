import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getLatestAnnouncements } from "@/lib/queries/announcements";
import { getActivePoll } from "@/lib/queries/polls";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Announcement, GalleryPhoto, Poll } from "@/types";

/**
 * ISR: revalidate setiap 60 detik.
 * Requirements: 4.1
 */
export const revalidate = 60;

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata = {
  title: "Beranda — Portal Warga Bukit Pandawa",
  description:
    "Portal komunitas warga perumahan Bukit Pandawa, Godean Jogja Hills.",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Kartu satu pengumuman */
function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const date = new Date(announcement.created_at).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-brand-green/30 hover:shadow-md">
      {/* Header: badge prioritas + tanggal */}
      <div className="flex items-center justify-between gap-2">
        <Badge priority={announcement.priority} />
        <time
          dateTime={announcement.created_at}
          className="shrink-0 text-xs text-gray-400"
        >
          {date}
        </time>
      </div>

      {/* Judul */}
      <h3 className="text-sm font-semibold leading-snug text-brand-black line-clamp-2">
        {announcement.title}
      </h3>

      {/* Isi (preview) */}
      <p className="text-sm leading-relaxed text-gray-600 line-clamp-3">
        {announcement.body}
      </p>
    </article>
  );
}

/** Ikon pengumuman untuk EmptyState */
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

/** Banner poll publik aktif — menampilkan judul poll dan link ke /voting */
function ActivePollBanner({ poll }: { poll: Poll }) {
  return (
    <section aria-labelledby="poll-banner-heading">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        {/* Ikon + teks */}
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
              className="h-5 w-5 text-brand-green"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <p
              id="poll-banner-heading"
              className="text-sm font-semibold text-brand-green"
            >
              Ada poll aktif
            </p>
            <p className="truncate text-xs text-green-700">
              {poll.title}
            </p>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/voting"
          className="shrink-0 rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
          aria-label={`Lihat poll aktif: ${poll.title}`}
        >
          Lihat
        </Link>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Halaman beranda portal warga Bukit Pandawa.
 *
 * - Sambutan singkat perumahan
 * - Daftar pengumuman terbaru (maks. 5) via ISR
 * - Banner poll publik aktif (placeholder — akan diisi di Task 19.2)
 *
 * Requirements: 4.1
 */
export default async function BerandaPage() {
  const supabase = await createClient();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const [announcements, activePoll, photosResult] = await Promise.all([
    getLatestAnnouncements(),
    getActivePoll(),
    supabase
      .from("gallery_photos")
      .select("id, album_id, url, caption, uploaded_by, created_at")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  // Konversi path relatif ke full Supabase Storage URL
  const latestPhotos: GalleryPhoto[] = (photosResult.data ?? []).map((photo) => ({
    ...photo,
    url: photo.url.startsWith("http")
      ? photo.url
      : `${supabaseUrl}/storage/v1/object/public/gallery/${photo.url}`,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6">
      {/* ── Sambutan ─────────────────────────────────────────────────── */}
      <section aria-labelledby="welcome-heading">
        <div className="rounded-2xl bg-brand-green px-5 py-6 text-white">
          <h1
            id="welcome-heading"
            className="text-xl font-bold leading-snug sm:text-2xl"
          >
            Selamat datang di
            <br />
            Bukit Pandawa 👋
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            Portal komunitas warga perumahan Bukit Pandawa, Godean Jogja Hills.
            Temukan informasi keuangan, galeri acara, pengumuman, dan voting
            warga di sini.
          </p>
        </div>
      </section>

      {/* ── Banner poll aktif ─────────────────────────────────────── */}
      {activePoll && <ActivePollBanner poll={activePoll} />}

      {/* ── Pengumuman terbaru ────────────────────────────────────────── */}
      <section aria-labelledby="announcements-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="announcements-heading"
            className="text-base font-bold text-brand-black"
          >
            Pengumuman Terbaru
          </h2>
          {/* Link ke halaman pengumuman lengkap (akan dibuat di task berikutnya) */}
          {announcements.length > 0 && (
            <Link
              href="/pengumuman"
              className="text-xs font-medium text-brand-green hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-1 rounded"
            >
              Lihat semua
            </Link>
          )}
        </div>

        {announcements.length === 0 ? (
          <EmptyState
            title="Belum ada pengumuman"
            description="Pengumuman dari pengurus perumahan akan muncul di sini."
            icon={<AnnouncementIcon />}
          />
        ) : (
          <ul className="space-y-3" role="list" aria-label="Daftar pengumuman">
            {announcements.map((announcement) => (
              <li key={announcement.id}>
                <Link
                  href="/pengumuman"
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 rounded-xl"
                  aria-label={`Baca pengumuman: ${announcement.title}`}
                >
                  <AnnouncementCard announcement={announcement} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Preview Galeri ────────────────────────────────────────── */}
      <section aria-labelledby="gallery-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="gallery-heading"
            className="text-base font-bold text-brand-black"
          >
            Galeri Foto
          </h2>
          <Link
            href="/galeri"
            className="text-xs font-medium text-brand-green hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-1 rounded"
          >
            Lihat semua
          </Link>
        </div>

        {latestPhotos.length === 0 ? (
          <EmptyState
            title="Belum ada foto"
            description="Foto acara perumahan akan muncul di sini."
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            }
          />
        ) : (
          <Link href="/galeri" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 rounded-xl" aria-label="Buka galeri foto">
            <div className="grid grid-cols-2 gap-2">
              {latestPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square overflow-hidden rounded-xl bg-gray-100"
                >
                  <Image
                    src={photo.url}
                    alt={photo.caption ?? "Foto acara perumahan"}
                    fill
                    sizes="(max-width: 640px) 45vw, 200px"
                    className="object-cover transition-transform duration-200 hover:scale-105"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </Link>
        )}
      </section>
    </div>
  );
}
