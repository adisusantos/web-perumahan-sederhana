"use client";

/**
 * Halaman Kelola Voting Admin — `/admin/voting`
 *
 * Fitur:
 * - Form buat poll baru (judul, deskripsi, tipe, gang scope, pilihan, durasi)
 * - List semua poll dengan status, jumlah suara, tombol tutup manual
 * - Secret link untuk poll gang dengan tombol salin
 * - Ketua gang hanya melihat poll milik gang sendiri
 *
 * Requirements: 4.6, 4.7
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PollFormFields, type PollFormData } from "@/components/voting/PollFormFields";
import { AdminPollCard } from "@/components/voting/AdminPollCard";
import { createClient } from "@/lib/supabase/client";
import type { Poll, PollOption, Profile } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PollWithDetails extends Poll {
  poll_options: PollOption[];
  total_votes: number;
}

// ─── Default Form Values ─────────────────────────────────────────────────────

function getDefaultFormValues(
  role?: Profile["role"],
  gang?: string | null
): PollFormData {
  return {
    title: "",
    description: "",
    type: role === "ketua_gang" ? "gang" : "public",
    gang_scope: role === "ketua_gang" && gang ? gang : "",
    options: ["", ""],
    closes_at: "",
  };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminVotingPage() {
  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Polls state
  const [polls, setPolls] = useState<PollWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState<PollFormData>(
    getDefaultFormValues()
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Close poll state
  const [closingId, setClosingId] = useState<string | null>(null);

  const supabase = createClient();
  const isKetuaGang = profile?.role === "ketua_gang";

  // ─── Load Profile ────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setProfileLoading(false);
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setProfile(data);
        setFormValues(getDefaultFormValues(data?.role, data?.gang));
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
  }, []);

  // ─── Load Polls ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (profileLoading) return;

    async function loadPolls() {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from("polls")
          .select(
            `
            *,
            poll_options (*)
          `
          )
          .order("created_at", { ascending: false });

        // Ketua gang hanya lihat poll milik gang sendiri
        if (isKetuaGang && profile?.gang) {
          query = query.or(`type.eq.public,and(type.eq.gang,gang_scope.eq.${profile.gang})`);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        // Hitung total votes dan votes per option untuk setiap poll
        const pollsWithVotes = await Promise.all(
          (data || []).map(async (poll) => {
            // Get all votes for this poll
            const { data: votes } = await supabase
              .from("poll_votes")
              .select("option_id")
              .eq("poll_id", poll.id);

            // Count votes per option
            const voteCountMap = new Map<string, number>();
            for (const vote of votes || []) {
              const current = voteCountMap.get(vote.option_id) || 0;
              voteCountMap.set(vote.option_id, current + 1);
            }

            // Add vote_count to each option
            const optionsWithVotes = poll.poll_options.map((option: PollOption) => ({
              ...option,
              vote_count: voteCountMap.get(option.id) || 0,
            }));

            return {
              ...poll,
              poll_options: optionsWithVotes,
              total_votes: votes?.length || 0,
            };
          })
        );

        setPolls(pollsWithVotes as PollWithDetails[]);
      } catch (err) {
        console.error("Error loading polls:", err);
        setError("Gagal memuat data poll. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    }

    loadPolls();
  }, [profileLoading, profile, isKetuaGang]);

  // ─── Form Handlers ───────────────────────────────────────────────────────

  const handleFormChange = (field: keyof PollFormData, value: string | string[]) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenForm = () => {
    setShowForm(true);
    setFormError(null);
    setFormValues(getDefaultFormValues(profile?.role, profile?.gang));
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      // Validasi
      if (!formValues.title.trim()) {
        throw new Error("Judul poll wajib diisi");
      }

      const validOptions = formValues.options.filter((opt) => opt.trim() !== "");
      if (validOptions.length < 2) {
        throw new Error("Minimal 2 pilihan harus diisi");
      }

      if (formValues.type === "gang" && !formValues.gang_scope.trim()) {
        throw new Error("Nama gang wajib diisi untuk poll gang");
      }

      // Prepare payload
      const payload: Record<string, unknown> = {
        title: formValues.title.trim(),
        description: formValues.description.trim() || null,
        type: formValues.type,
        gang_scope: formValues.type === "gang" ? formValues.gang_scope.trim() : null,
        options: validOptions,
        closes_at: formValues.closes_at 
          ? new Date(formValues.closes_at).toISOString() 
          : null,
      };

      // Call API
      const response = await fetch("/api/admin/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal membuat poll");
      }

      const { data: newPoll } = await response.json();

      // Hitung total votes (0 untuk poll baru)
      const pollWithVotes: PollWithDetails = {
        ...newPoll,
        total_votes: 0,
      };

      // Update state
      setPolls((prev) => [pollWithVotes, ...prev]);
      setShowForm(false);
      setFormValues(getDefaultFormValues(profile?.role, profile?.gang));
    } catch (err) {
      console.error("Error creating poll:", err);
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Close Poll Handler ──────────────────────────────────────────────────

  const handleClosePoll = async (pollId: string) => {
    setClosingId(pollId);

    try {
      const response = await fetch("/api/admin/polls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pollId }), // API expects 'id', not 'poll_id'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menutup poll");
      }

      const { data: updatedPoll } = await response.json();

      // Update state
      setPolls((prev) =>
        prev.map((p) =>
          p.id === pollId
            ? { ...p, ...updatedPoll, total_votes: p.total_votes }
            : p
        )
      );
    } catch (err) {
      console.error("Error closing poll:", err);
      setError(err instanceof Error ? err.message : "Gagal menutup poll");
    } finally {
      setClosingId(null);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (profileLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-gray-500">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Kelola Voting</h1>
          <p className="mt-1 text-sm text-gray-500">
            Buat dan kelola poll untuk warga
          </p>
        </div>
        {!showForm && (
          <Button onClick={handleOpenForm}>Buat Poll Baru</Button>
        )}
      </div>

      {/* Form - tampil saat showForm = true */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-brand-black">
            Buat Poll Baru
          </h2>

          {formError && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <PollFormFields
              values={formValues}
              onChange={handleFormChange}
              disabled={submitting}
              isKetuaGang={isKetuaGang}
              gangName={profile?.gang || undefined}
            />

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseForm}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" loading={submitting}>
                Buat Poll
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex min-h-[200px] items-center justify-center">
          <p className="text-sm text-gray-500">Memuat poll...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && polls.length === 0 && (
        <EmptyState
          title="Belum ada poll"
          description="Buat poll pertama untuk mulai mengumpulkan suara dari warga"
        />
      )}

      {/* Poll List */}
      {!loading && polls.length > 0 && (
        <div className="space-y-4">
          {polls.map((poll) => (
            <AdminPollCard
              key={poll.id}
              poll={poll}
              onClose={handleClosePoll}
              isClosing={closingId === poll.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
