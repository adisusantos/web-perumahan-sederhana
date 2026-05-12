"use client";

/**
 * Halaman Kelola Pengumuman — `/admin/pengumuman`
 *
 * Fitur:
 * - List semua pengumuman dengan opsi edit dan hapus
 * - Form buat pengumuman baru (judul, isi, prioritas)
 * - Form edit pengumuman yang sudah ada (inline / modal)
 * - Konfirmasi sebelum hapus
 *
 * Menggunakan API route `/api/admin/announcements` (Task 14.2).
 * Client Component karena ada interaktivitas penuh.
 *
 * Requirements: 4.6
 */

import React, { useCallback, useEffect, useReducer, useRef } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Announcement, AnnouncementPriority } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormValues {
  title: string;
  body: string;
  priority: AnnouncementPriority;
}

type FormMode = "create" | "edit";

interface PageState {
  /** Daftar pengumuman yang sudah dimuat */
  announcements: Announcement[];
  /** Status loading data awal */
  loading: boolean;
  /** Pesan error global */
  error: string | null;
  /** Apakah form buat/edit sedang ditampilkan */
  formOpen: boolean;
  /** Mode form: buat baru atau edit */
  formMode: FormMode;
  /** Pengumuman yang sedang diedit (null jika mode create) */
  editingId: string | null;
  /** Nilai form saat ini */
  formValues: FormValues;
  /** Status submit form */
  formSubmitting: boolean;
  /** Pesan error form */
  formError: string | null;
  /** ID pengumuman yang sedang dalam proses hapus */
  deletingId: string | null;
  /** ID pengumuman yang menampilkan konfirmasi hapus */
  confirmDeleteId: string | null;
}

type PageAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; announcements: Announcement[] }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "OPEN_CREATE_FORM" }
  | { type: "OPEN_EDIT_FORM"; announcement: Announcement }
  | { type: "CLOSE_FORM" }
  | { type: "SET_FORM_FIELD"; field: keyof FormValues; value: string }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS_CREATE"; announcement: Announcement }
  | { type: "SUBMIT_SUCCESS_EDIT"; announcement: Announcement }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "CONFIRM_DELETE"; id: string }
  | { type: "CANCEL_DELETE" }
  | { type: "DELETE_START"; id: string }
  | { type: "DELETE_SUCCESS"; id: string }
  | { type: "DELETE_ERROR"; error: string };

const DEFAULT_FORM: FormValues = {
  title: "",
  body: "",
  priority: "normal",
};

function reducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };

    case "LOAD_SUCCESS":
      return { ...state, loading: false, announcements: action.announcements };

    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };

    case "OPEN_CREATE_FORM":
      return {
        ...state,
        formOpen: true,
        formMode: "create",
        editingId: null,
        formValues: DEFAULT_FORM,
        formError: null,
      };

    case "OPEN_EDIT_FORM":
      return {
        ...state,
        formOpen: true,
        formMode: "edit",
        editingId: action.announcement.id,
        formValues: {
          title: action.announcement.title,
          body: action.announcement.body,
          priority: action.announcement.priority,
        },
        formError: null,
      };

    case "CLOSE_FORM":
      return {
        ...state,
        formOpen: false,
        editingId: null,
        formValues: DEFAULT_FORM,
        formError: null,
      };

    case "SET_FORM_FIELD":
      return {
        ...state,
        formValues: { ...state.formValues, [action.field]: action.value },
      };

    case "SUBMIT_START":
      return { ...state, formSubmitting: true, formError: null };

    case "SUBMIT_SUCCESS_CREATE":
      return {
        ...state,
        formSubmitting: false,
        formOpen: false,
        formValues: DEFAULT_FORM,
        announcements: [action.announcement, ...state.announcements],
      };

    case "SUBMIT_SUCCESS_EDIT":
      return {
        ...state,
        formSubmitting: false,
        formOpen: false,
        editingId: null,
        formValues: DEFAULT_FORM,
        announcements: state.announcements.map((a) =>
          a.id === action.announcement.id ? action.announcement : a
        ),
      };

    case "SUBMIT_ERROR":
      return { ...state, formSubmitting: false, formError: action.error };

    case "CONFIRM_DELETE":
      return { ...state, confirmDeleteId: action.id };

    case "CANCEL_DELETE":
      return { ...state, confirmDeleteId: null };

    case "DELETE_START":
      return { ...state, deletingId: action.id, confirmDeleteId: null };

    case "DELETE_SUCCESS":
      return {
        ...state,
        deletingId: null,
        announcements: state.announcements.filter((a) => a.id !== action.id),
      };

    case "DELETE_ERROR":
      return { ...state, deletingId: null, error: action.error };

    default:
      return state;
  }
}

const INITIAL_STATE: PageState = {
  announcements: [],
  loading: true,
  error: null,
  formOpen: false,
  formMode: "create",
  editingId: null,
  formValues: DEFAULT_FORM,
  formSubmitting: false,
  formError: null,
  deletingId: null,
  confirmDeleteId: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface AnnouncementFormProps {
  mode: FormMode;
  values: FormValues;
  submitting: boolean;
  error: string | null;
  onFieldChange: (field: keyof FormValues, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
}

function AnnouncementForm({
  mode,
  values,
  submitting,
  error,
  onFieldChange,
  onSubmit,
  onCancel,
  titleInputRef,
}: AnnouncementFormProps) {
  const isEdit = mode === "edit";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-heading"
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2
        id="form-heading"
        className="mb-4 text-base font-semibold text-brand-black"
      >
        {isEdit ? "Edit Pengumuman" : "Buat Pengumuman Baru"}
      </h2>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {/* Judul */}
        <div>
          <label
            htmlFor="ann-title"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Judul <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            ref={titleInputRef}
            id="ann-title"
            type="text"
            required
            maxLength={200}
            value={values.title}
            onChange={(e) => onFieldChange("title", e.target.value)}
            disabled={submitting}
            placeholder="Masukkan judul pengumuman"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-brand-black placeholder-gray-400 transition-colors focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            aria-required="true"
          />
        </div>

        {/* Isi */}
        <div>
          <label
            htmlFor="ann-body"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Isi Pengumuman <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <textarea
            id="ann-body"
            required
            rows={5}
            value={values.body}
            onChange={(e) => onFieldChange("body", e.target.value)}
            disabled={submitting}
            placeholder="Tulis isi pengumuman di sini…"
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-brand-black placeholder-gray-400 transition-colors focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            aria-required="true"
          />
        </div>

        {/* Prioritas */}
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-gray-700">
            Prioritas
          </legend>
          <div className="flex gap-4">
            {(["normal", "urgent"] as AnnouncementPriority[]).map((p) => (
              <label
                key={p}
                className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="ann-priority"
                  value={p}
                  checked={values.priority === p}
                  onChange={() => onFieldChange("priority", p)}
                  disabled={submitting}
                  className="h-4 w-4 accent-brand-green"
                />
                <span className="capitalize text-gray-700">
                  {p === "normal" ? "Normal" : "Urgent"}
                </span>
                <Badge priority={p} />
              </label>
            ))}
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
          >
            {isEdit ? "Simpan Perubahan" : "Buat Pengumuman"}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface DeleteConfirmProps {
  announcement: Announcement;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirm({ announcement, onConfirm, onCancel }: DeleteConfirmProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-heading"
      aria-describedby="delete-desc"
      className="rounded-xl border border-red-200 bg-red-50 p-4"
    >
      <h3
        id="delete-heading"
        className="text-sm font-semibold text-red-800"
      >
        Hapus Pengumuman?
      </h3>
      <p id="delete-desc" className="mt-1 text-sm text-red-700">
        Pengumuman &ldquo;{announcement.title}&rdquo; akan dihapus permanen dan tidak bisa
        dikembalikan.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={onConfirm}
        >
          Ya, Hapus
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
        >
          Batal
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Halaman kelola pengumuman admin.
 *
 * Requirements: 4.6
 */
export default function AdminPengumumanPage() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadAnnouncements = useCallback(async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const res = await fetch("/api/admin/announcements");
      const json = await res.json();

      if (!res.ok || !json.success) {
        dispatch({
          type: "LOAD_ERROR",
          error: json.message ?? "Gagal memuat pengumuman.",
        });
        return;
      }

      dispatch({ type: "LOAD_SUCCESS", announcements: json.data });
    } catch {
      dispatch({
        type: "LOAD_ERROR",
        error: "Terjadi kesalahan jaringan. Silakan muat ulang halaman.",
      });
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // Fokus ke input judul saat form dibuka
  useEffect(() => {
    if (state.formOpen) {
      // Tunggu render selesai
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [state.formOpen]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFieldChange = useCallback(
    (field: keyof FormValues, value: string) => {
      dispatch({ type: "SET_FORM_FIELD", field, value });
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const { title, body, priority } = state.formValues;

      if (!title.trim()) {
        dispatch({ type: "SUBMIT_ERROR", error: "Judul tidak boleh kosong." });
        return;
      }
      if (!body.trim()) {
        dispatch({
          type: "SUBMIT_ERROR",
          error: "Isi pengumuman tidak boleh kosong.",
        });
        return;
      }

      dispatch({ type: "SUBMIT_START" });

      try {
        const isEdit = state.formMode === "edit";
        const url = "/api/admin/announcements";
        const method = isEdit ? "PUT" : "POST";
        const payload = isEdit
          ? { id: state.editingId, title: title.trim(), body: body.trim(), priority }
          : { title: title.trim(), body: body.trim(), priority };

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          dispatch({
            type: "SUBMIT_ERROR",
            error: json.message ?? "Gagal menyimpan pengumuman.",
          });
          return;
        }

        if (isEdit) {
          dispatch({ type: "SUBMIT_SUCCESS_EDIT", announcement: json.data });
        } else {
          dispatch({ type: "SUBMIT_SUCCESS_CREATE", announcement: json.data });
        }
      } catch {
        dispatch({
          type: "SUBMIT_ERROR",
          error: "Terjadi kesalahan jaringan. Silakan coba lagi.",
        });
      }
    },
    [state.formValues, state.formMode, state.editingId]
  );

  const handleDelete = useCallback(async (id: string) => {
    dispatch({ type: "DELETE_START", id });
    try {
      const res = await fetch(`/api/admin/announcements?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        dispatch({
          type: "DELETE_ERROR",
          error: json.message ?? "Gagal menghapus pengumuman.",
        });
        return;
      }

      dispatch({ type: "DELETE_SUCCESS", id });
    } catch {
      dispatch({
        type: "DELETE_ERROR",
        error: "Terjadi kesalahan jaringan saat menghapus.",
      });
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Pengumuman</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola pengumuman yang ditampilkan kepada warga.
          </p>
        </div>
        {!state.formOpen && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => dispatch({ type: "OPEN_CREATE_FORM" })}
            leftIcon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
            }
          >
            Buat Pengumuman
          </Button>
        )}
      </div>

      {/* ── Global error ──────────────────────────────────────────── */}
      {state.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      {/* ── Form buat / edit ──────────────────────────────────────── */}
      {state.formOpen && (
        <AnnouncementForm
          mode={state.formMode}
          values={state.formValues}
          submitting={state.formSubmitting}
          error={state.formError}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
          onCancel={() => dispatch({ type: "CLOSE_FORM" })}
          titleInputRef={titleInputRef}
        />
      )}

      {/* ── Loading skeleton ──────────────────────────────────────── */}
      {state.loading && (
        <div className="space-y-3" aria-busy="true" aria-label="Memuat pengumuman">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-gray-100"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {!state.loading && state.announcements.length === 0 && !state.error && (
        <EmptyState
          title="Belum ada pengumuman"
          description="Buat pengumuman pertama untuk ditampilkan kepada warga."
          action={
            !state.formOpen ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => dispatch({ type: "OPEN_CREATE_FORM" })}
              >
                Buat Pengumuman
              </Button>
            ) : undefined
          }
        />
      )}

      {/* ── Daftar pengumuman ─────────────────────────────────────── */}
      {!state.loading && state.announcements.length > 0 && (
        <section aria-labelledby="list-heading">
          <h2 id="list-heading" className="sr-only">
            Daftar pengumuman
          </h2>
          <ul
            role="list"
            className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white"
          >
            {state.announcements.map((ann) => {
              const isDeleting = state.deletingId === ann.id;
              const isConfirmingDelete = state.confirmDeleteId === ann.id;
              const isBeingEdited =
                state.formOpen &&
                state.formMode === "edit" &&
                state.editingId === ann.id;

              return (
                <li
                  key={ann.id}
                  className={[
                    "px-5 py-4 transition-colors",
                    isBeingEdited ? "bg-brand-green/5" : "",
                    isDeleting ? "opacity-50" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-busy={isDeleting}
                >
                  {/* Konfirmasi hapus */}
                  {isConfirmingDelete ? (
                    <DeleteConfirm
                      announcement={ann}
                      onConfirm={() => handleDelete(ann.id)}
                      onCancel={() => dispatch({ type: "CANCEL_DELETE" })}
                    />
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      {/* Info pengumuman */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-brand-black">
                            {ann.title}
                          </h3>
                          <Badge priority={ann.priority} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                          {ann.body}
                        </p>
                        <p className="mt-1.5 text-xs text-gray-400">
                          Dibuat {formatDate(ann.created_at)}
                          {ann.updated_at && (
                            <> · Diedit {formatDate(ann.updated_at)}</>
                          )}
                        </p>
                      </div>

                      {/* Tombol aksi */}
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isDeleting || state.formSubmitting}
                          onClick={() =>
                            dispatch({ type: "OPEN_EDIT_FORM", announcement: ann })
                          }
                          aria-label={`Edit pengumuman: ${ann.title}`}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          loading={isDeleting}
                          disabled={state.formSubmitting}
                          onClick={() =>
                            dispatch({ type: "CONFIRM_DELETE", id: ann.id })
                          }
                          aria-label={`Hapus pengumuman: ${ann.title}`}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
