"use client";

/**
 * Halaman Kelola Akun — `/admin/akun`
 *
 * Fitur:
 * - List semua akun ketua gang
 * - Form buat akun baru (nama, email, password, gang)
 * - Tombol reset password (dengan form password baru)
 * - Tombol nonaktifkan akun (dengan konfirmasi)
 *
 * Halaman ini hanya muncul di menu admin — disembunyikan dari ketua_gang.
 * Menggunakan API route `/api/admin/accounts`.
 *
 * Requirements: 4.6
 */

import React, { useCallback, useEffect, useReducer, useRef } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Profile } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateFormValues {
  name: string;
  email: string;
  password: string;
  gang: string;
}

interface ResetPasswordValues {
  new_password: string;
}

interface PageState {
  accounts: Profile[];
  loading: boolean;
  error: string | null;
  // Create form
  createFormOpen: boolean;
  createValues: CreateFormValues;
  createSubmitting: boolean;
  createError: string | null;
  // Reset password
  resetPasswordId: string | null;
  resetValues: ResetPasswordValues;
  resetSubmitting: boolean;
  resetError: string | null;
  // Disable account
  confirmDisableId: string | null;
  disablingId: string | null;
}

type PageAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; accounts: Profile[] }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "OPEN_CREATE_FORM" }
  | { type: "CLOSE_CREATE_FORM" }
  | { type: "SET_CREATE_FIELD"; field: keyof CreateFormValues; value: string }
  | { type: "CREATE_START" }
  | { type: "CREATE_SUCCESS"; account: Profile }
  | { type: "CREATE_ERROR"; error: string }
  | { type: "OPEN_RESET_PASSWORD"; id: string }
  | { type: "CLOSE_RESET_PASSWORD" }
  | { type: "SET_RESET_PASSWORD"; value: string }
  | { type: "RESET_START" }
  | { type: "RESET_SUCCESS" }
  | { type: "RESET_ERROR"; error: string }
  | { type: "CONFIRM_DISABLE"; id: string }
  | { type: "CANCEL_DISABLE" }
  | { type: "DISABLE_START"; id: string }
  | { type: "DISABLE_SUCCESS"; id: string }
  | { type: "DISABLE_ERROR"; error: string };

const DEFAULT_CREATE: CreateFormValues = {
  name: "",
  email: "",
  password: "",
  gang: "",
};

function reducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };
    case "LOAD_SUCCESS":
      return { ...state, loading: false, accounts: action.accounts };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };

    case "OPEN_CREATE_FORM":
      return { ...state, createFormOpen: true, createValues: DEFAULT_CREATE, createError: null };
    case "CLOSE_CREATE_FORM":
      return { ...state, createFormOpen: false, createError: null };
    case "SET_CREATE_FIELD":
      return { ...state, createValues: { ...state.createValues, [action.field]: action.value } };
    case "CREATE_START":
      return { ...state, createSubmitting: true, createError: null };
    case "CREATE_SUCCESS":
      return {
        ...state,
        createSubmitting: false,
        createFormOpen: false,
        createValues: DEFAULT_CREATE,
        accounts: [action.account, ...state.accounts],
      };
    case "CREATE_ERROR":
      return { ...state, createSubmitting: false, createError: action.error };

    case "OPEN_RESET_PASSWORD":
      return { ...state, resetPasswordId: action.id, resetValues: { new_password: "" }, resetError: null };
    case "CLOSE_RESET_PASSWORD":
      return { ...state, resetPasswordId: null, resetError: null };
    case "SET_RESET_PASSWORD":
      return { ...state, resetValues: { new_password: action.value } };
    case "RESET_START":
      return { ...state, resetSubmitting: true, resetError: null };
    case "RESET_SUCCESS":
      return { ...state, resetSubmitting: false, resetPasswordId: null };
    case "RESET_ERROR":
      return { ...state, resetSubmitting: false, resetError: action.error };

    case "CONFIRM_DISABLE":
      return { ...state, confirmDisableId: action.id };
    case "CANCEL_DISABLE":
      return { ...state, confirmDisableId: null };
    case "DISABLE_START":
      return { ...state, disablingId: action.id, confirmDisableId: null };
    case "DISABLE_SUCCESS":
      return {
        ...state,
        disablingId: null,
        // Hapus dari list setelah dinonaktifkan
        accounts: state.accounts.filter((a) => a.id !== action.id),
      };
    case "DISABLE_ERROR":
      return { ...state, disablingId: null, error: action.error };

    default:
      return state;
  }
}

const INITIAL_STATE: PageState = {
  accounts: [],
  loading: true,
  error: null,
  createFormOpen: false,
  createValues: DEFAULT_CREATE,
  createSubmitting: false,
  createError: null,
  resetPasswordId: null,
  resetValues: { new_password: "" },
  resetSubmitting: false,
  resetError: null,
  confirmDisableId: null,
  disablingId: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CreateFormProps {
  values: CreateFormValues;
  submitting: boolean;
  error: string | null;
  onFieldChange: (field: keyof CreateFormValues, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
}

function CreateAccountForm({
  values,
  submitting,
  error,
  onFieldChange,
  onSubmit,
  onCancel,
  nameInputRef,
}: CreateFormProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-form-heading"
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2
        id="create-form-heading"
        className="mb-4 text-base font-semibold text-brand-black"
      >
        Buat Akun Ketua Gang
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
        {/* Nama */}
        <div>
          <label
            htmlFor="acc-name"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Nama Lengkap <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            ref={nameInputRef}
            id="acc-name"
            type="text"
            required
            maxLength={100}
            value={values.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            disabled={submitting}
            placeholder="Nama ketua gang"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-brand-black placeholder-gray-400 transition-colors focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            aria-required="true"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="acc-email"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Email <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="acc-email"
            type="email"
            required
            value={values.email}
            onChange={(e) => onFieldChange("email", e.target.value)}
            disabled={submitting}
            placeholder="email@contoh.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-brand-black placeholder-gray-400 transition-colors focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            aria-required="true"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="acc-password"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Password <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="acc-password"
            type="password"
            required
            minLength={8}
            value={values.password}
            onChange={(e) => onFieldChange("password", e.target.value)}
            disabled={submitting}
            placeholder="Minimal 8 karakter"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-brand-black placeholder-gray-400 transition-colors focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            aria-required="true"
          />
        </div>

        {/* Gang */}
        <div>
          <label
            htmlFor="acc-gang"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Gang <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="acc-gang"
            type="text"
            required
            maxLength={50}
            value={values.gang}
            onChange={(e) => onFieldChange("gang", e.target.value)}
            disabled={submitting}
            placeholder="Contoh: Gang 1"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-brand-black placeholder-gray-400 transition-colors focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            aria-required="true"
          />
        </div>

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
            Buat Akun
          </Button>
        </div>
      </form>
    </div>
  );
}

interface ResetPasswordFormProps {
  accountName: string;
  value: string;
  submitting: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function ResetPasswordForm({
  accountName,
  value,
  submitting,
  error,
  onChange,
  onSubmit,
  onCancel,
}: ResetPasswordFormProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-form-heading"
      className="rounded-xl border border-amber-200 bg-amber-50 p-4"
    >
      <h3
        id="reset-form-heading"
        className="text-sm font-semibold text-amber-800"
      >
        Reset Password — {accountName}
      </h3>

      {error && (
        <div
          role="alert"
          className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-3 space-y-3">
        <div>
          <label
            htmlFor="new-password"
            className="mb-1 block text-sm font-medium text-amber-900"
          >
            Password Baru <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="new-password"
            type="password"
            required
            minLength={8}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={submitting}
            placeholder="Minimal 8 karakter"
            className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-brand-black placeholder-gray-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-gray-50"
            aria-required="true"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={submitting}
          >
            Simpan Password
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={submitting}
          >
            Batal
          </Button>
        </div>
      </form>
    </div>
  );
}

interface DisableConfirmProps {
  accountName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DisableConfirm({ accountName, onConfirm, onCancel }: DisableConfirmProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="disable-heading"
      aria-describedby="disable-desc"
      className="rounded-xl border border-red-200 bg-red-50 p-4"
    >
      <h3 id="disable-heading" className="text-sm font-semibold text-red-800">
        Nonaktifkan Akun?
      </h3>
      <p id="disable-desc" className="mt-1 text-sm text-red-700">
        Akun <strong>{accountName}</strong> akan dinonaktifkan. Pengguna tidak
        akan bisa login lagi.
      </p>
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="danger" size="sm" onClick={onConfirm}>
          Ya, Nonaktifkan
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Halaman kelola akun ketua gang — hanya untuk admin.
 *
 * Requirements: 4.6
 */
export default function AdminAkunPage() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadAccounts = useCallback(async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const res = await fetch("/api/admin/accounts");
      const json = await res.json();

      if (!res.ok || !json.success) {
        dispatch({
          type: "LOAD_ERROR",
          error: json.message ?? "Gagal memuat data akun.",
        });
        return;
      }

      dispatch({ type: "LOAD_SUCCESS", accounts: json.data });
    } catch {
      dispatch({
        type: "LOAD_ERROR",
        error: "Terjadi kesalahan jaringan. Silakan muat ulang halaman.",
      });
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Fokus ke input nama saat form dibuka
  useEffect(() => {
    if (state.createFormOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [state.createFormOpen]);

  // ── Create account ─────────────────────────────────────────────────────────
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const { name, email, password, gang } = state.createValues;

      if (!name.trim()) {
        dispatch({ type: "CREATE_ERROR", error: "Nama tidak boleh kosong." });
        return;
      }
      if (!email.trim()) {
        dispatch({ type: "CREATE_ERROR", error: "Email tidak boleh kosong." });
        return;
      }
      if (password.length < 8) {
        dispatch({ type: "CREATE_ERROR", error: "Password minimal 8 karakter." });
        return;
      }
      if (!gang.trim()) {
        dispatch({ type: "CREATE_ERROR", error: "Gang tidak boleh kosong." });
        return;
      }

      dispatch({ type: "CREATE_START" });
      try {
        const res = await fetch("/api/admin/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            gang: gang.trim(),
          }),
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          dispatch({
            type: "CREATE_ERROR",
            error: json.message ?? "Gagal membuat akun.",
          });
          return;
        }

        dispatch({ type: "CREATE_SUCCESS", account: json.data });
      } catch {
        dispatch({
          type: "CREATE_ERROR",
          error: "Terjadi kesalahan jaringan. Silakan coba lagi.",
        });
      }
    },
    [state.createValues]
  );

  // ── Reset password ─────────────────────────────────────────────────────────
  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const { new_password } = state.resetValues;

      if (new_password.length < 8) {
        dispatch({ type: "RESET_ERROR", error: "Password minimal 8 karakter." });
        return;
      }

      dispatch({ type: "RESET_START" });
      try {
        const res = await fetch("/api/admin/accounts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: state.resetPasswordId,
            action: "reset_password",
            new_password,
          }),
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          dispatch({
            type: "RESET_ERROR",
            error: json.message ?? "Gagal mereset password.",
          });
          return;
        }

        dispatch({ type: "RESET_SUCCESS" });
      } catch {
        dispatch({
          type: "RESET_ERROR",
          error: "Terjadi kesalahan jaringan. Silakan coba lagi.",
        });
      }
    },
    [state.resetPasswordId, state.resetValues]
  );

  // ── Disable account ────────────────────────────────────────────────────────
  const handleDisable = useCallback(async (id: string) => {
    dispatch({ type: "DISABLE_START", id });
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "disable" }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        dispatch({
          type: "DISABLE_ERROR",
          error: json.message ?? "Gagal menonaktifkan akun.",
        });
        return;
      }

      dispatch({ type: "DISABLE_SUCCESS", id });
    } catch {
      dispatch({
        type: "DISABLE_ERROR",
        error: "Terjadi kesalahan jaringan saat menonaktifkan akun.",
      });
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Kelola Akun</h1>
          <p className="mt-1 text-sm text-gray-500">
            Buat dan kelola akun ketua gang.
          </p>
        </div>
        {!state.createFormOpen && (
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
            Buat Akun
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

      {/* ── Create form ───────────────────────────────────────────── */}
      {state.createFormOpen && (
        <CreateAccountForm
          values={state.createValues}
          submitting={state.createSubmitting}
          error={state.createError}
          onFieldChange={(field, value) =>
            dispatch({ type: "SET_CREATE_FIELD", field, value })
          }
          onSubmit={handleCreate}
          onCancel={() => dispatch({ type: "CLOSE_CREATE_FORM" })}
          nameInputRef={nameInputRef}
        />
      )}

      {/* ── Loading skeleton ──────────────────────────────────────── */}
      {state.loading && (
        <div
          className="space-y-3"
          aria-busy="true"
          aria-label="Memuat data akun"
        >
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
      {!state.loading && state.accounts.length === 0 && !state.error && (
        <EmptyState
          title="Belum ada akun ketua gang"
          description="Buat akun untuk ketua gang agar mereka bisa login dan mengelola poll."
          action={
            !state.createFormOpen ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => dispatch({ type: "OPEN_CREATE_FORM" })}
              >
                Buat Akun
              </Button>
            ) : undefined
          }
        />
      )}

      {/* ── Daftar akun ───────────────────────────────────────────── */}
      {!state.loading && state.accounts.length > 0 && (
        <section aria-labelledby="accounts-list-heading">
          <h2 id="accounts-list-heading" className="sr-only">
            Daftar akun ketua gang
          </h2>
          <ul
            role="list"
            className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white"
          >
            {state.accounts.map((account) => {
              const isDisabling = state.disablingId === account.id;
              const isConfirmingDisable = state.confirmDisableId === account.id;
              const isResettingPassword = state.resetPasswordId === account.id;

              return (
                <li
                  key={account.id}
                  className={[
                    "px-5 py-4 transition-colors",
                    isDisabling ? "opacity-50" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-busy={isDisabling}
                >
                  {/* Konfirmasi nonaktifkan */}
                  {isConfirmingDisable ? (
                    <DisableConfirm
                      accountName={account.name}
                      onConfirm={() => handleDisable(account.id)}
                      onCancel={() => dispatch({ type: "CANCEL_DISABLE" })}
                    />
                  ) : isResettingPassword ? (
                    /* Form reset password */
                    <ResetPasswordForm
                      accountName={account.name}
                      value={state.resetValues.new_password}
                      submitting={state.resetSubmitting}
                      error={state.resetError}
                      onChange={(value) =>
                        dispatch({ type: "SET_RESET_PASSWORD", value })
                      }
                      onSubmit={handleResetPassword}
                      onCancel={() =>
                        dispatch({ type: "CLOSE_RESET_PASSWORD" })
                      }
                    />
                  ) : (
                    /* Info akun + tombol aksi */
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-brand-black">
                            {account.name}
                          </h3>
                          <Badge
                            pollStatus="active"
                            label="Ketua Gang"
                          />
                        </div>
                        {account.gang && (
                          <p className="mt-0.5 text-sm text-gray-600">
                            {account.gang}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          Dibuat {formatDate(account.created_at)}
                        </p>
                      </div>

                      {/* Tombol aksi */}
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isDisabling}
                          onClick={() =>
                            dispatch({
                              type: "OPEN_RESET_PASSWORD",
                              id: account.id,
                            })
                          }
                          aria-label={`Reset password akun ${account.name}`}
                        >
                          Reset Password
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          loading={isDisabling}
                          onClick={() =>
                            dispatch({
                              type: "CONFIRM_DISABLE",
                              id: account.id,
                            })
                          }
                          aria-label={`Nonaktifkan akun ${account.name}`}
                        >
                          Nonaktifkan
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
