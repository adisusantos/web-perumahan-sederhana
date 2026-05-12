/**
 * Form fields untuk membuat/edit poll
 * Komponen reusable yang bisa dipakai di admin panel
 */

import React from "react";
import { Button } from "@/components/ui/Button";
import type { PollType } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PollFormData {
  title: string;
  description: string;
  type: PollType;
  gang_scope: string;
  options: string[];
  closes_at: string;
}

interface PollFormFieldsProps {
  values: PollFormData;
  onChange: (field: keyof PollFormData, value: string | string[]) => void;
  disabled?: boolean;
  isKetuaGang?: boolean;
  gangName?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PollFormFields({
  values,
  onChange,
  disabled = false,
  isKetuaGang = false,
  gangName,
}: PollFormFieldsProps) {
  // Handler untuk update option di index tertentu
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...values.options];
    newOptions[index] = value;
    onChange("options", newOptions);
  };

  // Handler untuk tambah option baru
  const handleAddOption = () => {
    if (values.options.length < 10) {
      onChange("options", [...values.options, ""]);
    }
  };

  // Handler untuk hapus option
  const handleRemoveOption = (index: number) => {
    if (values.options.length > 2) {
      const newOptions = values.options.filter((_, i) => i !== index);
      onChange("options", newOptions);
    }
  };

  return (
    <div className="space-y-4">
      {/* Judul */}
      <div>
        <label
          htmlFor="poll-title"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Judul <span className="text-red-500">*</span>
        </label>
        <input
          id="poll-title"
          type="text"
          required
          maxLength={200}
          value={values.title}
          onChange={(e) => onChange("title", e.target.value)}
          disabled={disabled}
          placeholder="Masukkan judul poll"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>

      {/* Deskripsi */}
      <div>
        <label
          htmlFor="poll-desc"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Deskripsi
        </label>
        <textarea
          id="poll-desc"
          rows={3}
          value={values.description}
          onChange={(e) => onChange("description", e.target.value)}
          disabled={disabled}
          placeholder="Deskripsi opsional"
          className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>

      {/* Tipe Poll */}
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-gray-700">
          Tipe Poll <span className="text-red-500">*</span>
        </legend>
        <div className="flex gap-4">
          {!isKetuaGang && (
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="poll-type"
                value="public"
                checked={values.type === "public"}
                onChange={() => onChange("type", "public")}
                disabled={disabled}
                className="h-4 w-4 accent-brand-green"
              />
              <span className="text-sm text-gray-700">Publik</span>
            </label>
          )}
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="poll-type"
              value="gang"
              checked={values.type === "gang"}
              onChange={() => onChange("type", "gang")}
              disabled={disabled || isKetuaGang}
              className="h-4 w-4 accent-brand-green"
            />
            <span className="text-sm text-gray-700">Gang</span>
          </label>
        </div>
      </fieldset>

      {/* Gang Scope - tampil hanya jika tipe = gang */}
      {values.type === "gang" && (
        <div>
          <label
            htmlFor="poll-gang"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Nama Gang <span className="text-red-500">*</span>
          </label>
          <input
            id="poll-gang"
            type="text"
            required
            value={isKetuaGang ? gangName || "" : values.gang_scope}
            onChange={(e) => onChange("gang_scope", e.target.value)}
            disabled={disabled || isKetuaGang}
            readOnly={isKetuaGang}
            placeholder="Masukkan nama gang"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:bg-gray-50 disabled:text-gray-400 read-only:bg-gray-50"
          />
          {isKetuaGang && (
            <p className="mt-1 text-xs text-gray-400">
              Gang scope dikunci sesuai gang Anda.
            </p>
          )}
        </div>
      )}

      {/* Pilihan */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">
          Pilihan <span className="text-red-500">*</span>
          <span className="ml-1 font-normal text-gray-400">(min 2, maks 10)</span>
        </p>
        <div className="space-y-2">
          {values.options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                disabled={disabled}
                placeholder={`Pilihan ${idx + 1}`}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:bg-gray-50 disabled:text-gray-400"
              />
              {values.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  disabled={disabled}
                  className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        {values.options.length < 10 && (
          <button
            type="button"
            onClick={handleAddOption}
            disabled={disabled}
            className="mt-2 flex min-h-[44px] items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-brand-green hover:text-brand-green disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Tambah Pilihan
          </button>
        )}
      </div>

      {/* Tutup Otomatis */}
      <div>
        <label
          htmlFor="poll-closes"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Tutup Otomatis
          <span className="ml-1 font-normal text-gray-400">(opsional)</span>
        </label>
        <input
          id="poll-closes"
          type="datetime-local"
          value={values.closes_at}
          onChange={(e) => onChange("closes_at", e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:bg-gray-50 disabled:text-gray-400"
        />
        <p className="mt-1 text-xs text-gray-400">
          Kosongkan jika ingin menutup poll secara manual.
        </p>
      </div>
    </div>
  );
}
