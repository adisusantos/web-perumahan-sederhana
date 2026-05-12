"use client";


/**
 * Halaman Kelola Galeri — `/admin/galeri`
 *
 * Fitur:
 * - Form buat album baru
 * - Upload foto ke album (dengan validasi ukuran dan format di client-side)
 * - Tampilkan daftar foto per album dengan opsi hapus
 *
 * Menggunakan API route `/api/admin/gallery/albums` dan `/api/admin/gallery/photos`.
 * Client Component karena ada interaktivitas penuh.
 *
 * Requirements: 4.3, 4.6
 */

import React, { useCallback, useEffect, useReducer, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { GalleryAlbum, GalleryPhoto } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlbumWithPhotos extends GalleryAlbum {
  photos: GalleryPhoto[];
}

interface AlbumFormValues {
  name: string;
  description: string;
}

interface PhotoUploadValues {
  file: File | null;
  caption: string;
}

interface PageState {
  /** Daftar album yang sudah dimuat */
  albums: AlbumWithPhotos[];
  /** Status loading data awal */
  loading: boolean;
  /** Pesan error global */
  error: string | null;
  /** Apakah form buat album sedang ditampilkan */
  albumFormOpen: boolean;
  /** Nilai form album */
  albumFormValues: AlbumFormValues;
  /** Status submit form album */
  albumFormSubmitting: boolean;
  /** Pesan error form album */
  albumFormError: string | null;
  /** ID album yang dipilih untuk upload foto */
  selectedAlbumId: string | null;
  /** Nilai form upload foto */
  photoUploadValues: PhotoUploadValues;
  /** Status upload foto */
  photoUploading: boolean;
  /** Pesan error upload foto */
  photoUploadError: string | null;
  /** ID album yang sedang dalam proses hapus */
  deletingAlbumId: string | null;
  /** ID album yang menampilkan konfirmasi hapus */
  confirmDeleteAlbumId: string | null;
  /** ID foto yang sedang dalam proses hapus */
  deletingPhotoId: string | null;
  /** ID foto yang menampilkan konfirmasi hapus */
  confirmDeletePhotoId: string | null;
}

type PageAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; albums: AlbumWithPhotos[] }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "OPEN_ALBUM_FORM" }
  | { type: "CLOSE_ALBUM_FORM" }
  | { type: "SET_ALBUM_FIELD"; field: keyof AlbumFormValues; value: string }
  | { type: "ALBUM_SUBMIT_START" }
  | { type: "ALBUM_SUBMIT_SUCCESS"; album: AlbumWithPhotos }
  | { type: "ALBUM_SUBMIT_ERROR"; error: string }
  | { type: "SELECT_ALBUM"; albumId: string }
  | { type: "DESELECT_ALBUM" }
  | { type: "SET_PHOTO_FILE"; file: File | null }
  | { type: "SET_PHOTO_CAPTION"; caption: string }
  | { type: "PHOTO_UPLOAD_START" }
  | { type: "PHOTO_UPLOAD_SUCCESS"; albumId: string; photo: GalleryPhoto }
  | { type: "PHOTO_UPLOAD_ERROR"; error: string }
  | { type: "CONFIRM_DELETE_ALBUM"; id: string }
  | { type: "CANCEL_DELETE_ALBUM" }
  | { type: "DELETE_ALBUM_START"; id: string }
  | { type: "DELETE_ALBUM_SUCCESS"; id: string }
  | { type: "DELETE_ALBUM_ERROR"; error: string }
  | { type: "CONFIRM_DELETE_PHOTO"; id: string }
  | { type: "CANCEL_DELETE_PHOTO" }
  | { type: "DELETE_PHOTO_START"; id: string }
  | { type: "DELETE_PHOTO_SUCCESS"; albumId: string; photoId: string }
  | { type: "DELETE_PHOTO_ERROR"; error: string };

const DEFAULT_ALBUM_FORM: AlbumFormValues = {
  name: "",
  description: "",
};

const DEFAULT_PHOTO_UPLOAD: PhotoUploadValues = {
  file: null,
  caption: "",
};

function reducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };

    case "LOAD_SUCCESS":
      return { ...state, loading: false, albums: action.albums };

    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };

    case "OPEN_ALBUM_FORM":
      return {
        ...state,
        albumFormOpen: true,
        albumFormValues: DEFAULT_ALBUM_FORM,
        albumFormError: null,
      };

    case "CLOSE_ALBUM_FORM":
      return {
        ...state,
        albumFormOpen: false,
        albumFormValues: DEFAULT_ALBUM_FORM,
        albumFormError: null,
      };

    case "SET_ALBUM_FIELD":
      return {
        ...state,
        albumFormValues: { ...state.albumFormValues, [action.field]: action.value },
      };

    case "ALBUM_SUBMIT_START":
      return { ...state, albumFormSubmitting: true, albumFormError: null };

    case "ALBUM_SUBMIT_SUCCESS":
      return {
        ...state,
        albumFormSubmitting: false,
        albumFormOpen: false,
        albumFormValues: DEFAULT_ALBUM_FORM,
        albums: [action.album, ...state.albums],
      };

    case "ALBUM_SUBMIT_ERROR":
      return { ...state, albumFormSubmitting: false, albumFormError: action.error };

    case "SELECT_ALBUM":
      return {
        ...state,
        selectedAlbumId: action.albumId,
        photoUploadValues: DEFAULT_PHOTO_UPLOAD,
        photoUploadError: null,
      };

    case "DESELECT_ALBUM":
      return {
        ...state,
        selectedAlbumId: null,
        photoUploadValues: DEFAULT_PHOTO_UPLOAD,
        photoUploadError: null,
      };

    case "SET_PHOTO_FILE":
      return {
        ...state,
        photoUploadValues: { ...state.photoUploadValues, file: action.file },
      };

    case "SET_PHOTO_CAPTION":
      return {
        ...state,
        photoUploadValues: { ...state.photoUploadValues, caption: action.caption },
      };

    case "PHOTO_UPLOAD_START":
      return { ...state, photoUploading: true, photoUploadError: null };

    case "PHOTO_UPLOAD_SUCCESS":
      return {
        ...state,
        photoUploading: false,
        photoUploadValues: DEFAULT_PHOTO_UPLOAD,
        albums: state.albums.map((a) =>
          a.id === action.albumId
            ? { ...a, photos: [...a.photos, action.photo] }
            : a
        ),
      };

    case "PHOTO_UPLOAD_ERROR":
      return { ...state, photoUploading: false, photoUploadError: action.error };

    case "CONFIRM_DELETE_ALBUM":
      return { ...state, confirmDeleteAlbumId: action.id };

    case "CANCEL_DELETE_ALBUM":
      return { ...state, confirmDeleteAlbumId: null };

    case "DELETE_ALBUM_START":
      return { ...state, deletingAlbumId: action.id, confirmDeleteAlbumId: null };

    case "DELETE_ALBUM_SUCCESS":
      return {
        ...state,
        deletingAlbumId: null,
        albums: state.albums.filter((a) => a.id !== action.id),
        selectedAlbumId: state.selectedAlbumId === action.id ? null : state.selectedAlbumId,
      };

    case "DELETE_ALBUM_ERROR":
      return { ...state, deletingAlbumId: null, error: action.error };

    case "CONFIRM_DELETE_PHOTO":
      return { ...state, confirmDeletePhotoId: action.id };

    case "CANCEL_DELETE_PHOTO":
      return { ...state, confirmDeletePhotoId: null };

    case "DELETE_PHOTO_START":
      return { ...state, deletingPhotoId: action.id, confirmDeletePhotoId: null };

    case "DELETE_PHOTO_SUCCESS":
      return {
        ...state,
        deletingPhotoId: null,
        albums: state.albums.map((a) =>
          a.id === action.albumId
            ? { ...a, photos: a.photos.filter((p) => p.id !== action.photoId) }
            : a
        ),
      };

    case "DELETE_PHOTO_ERROR":
      return { ...state, deletingPhotoId: null, error: action.error };

    default:
      return state;
  }
}

const INITIAL_STATE: PageState = {
  albums: [],
  loading: true,
  error: null,
  albumFormOpen: false,
  albumFormValues: DEFAULT_ALBUM_FORM,
  albumFormSubmitting: false,
  albumFormError: null,
  selectedAlbumId: null,
  photoUploadValues: DEFAULT_PHOTO_UPLOAD,
  photoUploading: false,
  photoUploadError: null,
  deletingAlbumId: null,
  confirmDeleteAlbumId: null,
  deletingPhotoId: null,
  confirmDeletePhotoId: null,
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function validateFile(file: File): string | null {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return `Format file tidak didukung. Hanya menerima: ${ALLOWED_FILE_TYPES.join(", ")}.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Ukuran file melebihi batas maksimal 5MB.";
  }
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface AlbumFormProps {
  values: AlbumFormValues;
  submitting: boolean;
  error: string | null;
  onFieldChange: (field: keyof AlbumFormValues, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
}

function AlbumForm({
  values,
  submitting,
  error,
  onFieldChange,
  onSubmit,
  onCancel,
  nameInputRef,
}: AlbumFormProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="album-form-heading"
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2
        id="album-form-heading"
        className="mb-4 text-base font-semibold text-brand-black"
      >
        Buat Album Baru
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
        {/* Nama Album */}
        <div>
          <label
            htmlFor="album-name"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Nama Album <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            ref={nameInputRef}
            id="album-name"
            type="text"
            required
            maxLength={200}
            value={values.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            disabled={submitting}
            placeholder="Contoh: Acara 17 Agustus 2024"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-brand-black placeholder-gray-400 transition-colors focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            aria-required="true"
          />
        </div>

        {/* Deskripsi */}
        <div>
          <label
            htmlFor="album-description"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Deskripsi <span className="text-gray-400 font-normal">(opsional)</span>
          </label>
          <textarea
            id="album-description"
            rows={3}
            value={values.description}
            onChange={(e) => onFieldChange("description", e.target.value)}
            disabled={submitting}
            placeholder="Deskripsi singkat tentang album ini…"
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-brand-black placeholder-gray-400 transition-colors focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
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
            Buat Album
          </Button>
        </div>
      </form>
    </div>
  );
}

interface PhotoUploadSectionProps {
  album: AlbumWithPhotos;
  values: PhotoUploadValues;
  uploading: boolean;
  error: string | null;
  onFileChange: (file: File | null) => void;
  onCaptionChange: (caption: string) => void;
  onUpload: (e: React.FormEvent) => void;
  onClose: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

function PhotoUploadSection({
  album,
  values,
  uploading,
  error,
  onFileChange,
  onCaptionChange,
  onUpload,
  onClose,
  fileInputRef,
}: PhotoUploadSectionProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onFileChange(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-upload-heading"
      className="rounded-xl border border-brand-green/30 bg-brand-green/5 p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3
          id="photo-upload-heading"
          className="text-base font-semibold text-brand-black"
        >
          Upload Foto ke &ldquo;{album.name}&rdquo;
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
          aria-label="Tutup panel upload"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={onUpload} noValidate className="space-y-4">
        {/* File input */}
        <div>
          <label
            htmlFor="photo-file"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Pilih Foto <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            ref={fileInputRef}
            id="photo-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            disabled={uploading}
            onChange={handleFileChange}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-brand-black file:mr-3 file:rounded-md file:border-0 file:bg-brand-green file:px-3 file:py-1 file:text-sm file:font-medium file:text-white hover:file:bg-[#1e3d07] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            aria-required="true"
            aria-describedby="photo-file-hint"
          />
          <p id="photo-file-hint" className="mt-1 text-xs text-gray-500">
            Format: JPEG, PNG, WebP. Maksimal 5MB.
          </p>
          {values.file && (
            <p className="mt-1 text-xs text-brand-green">
              Dipilih: {values.file.name} ({(values.file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* Caption */}
        <div>
          <label
            htmlFor="photo-caption"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Keterangan <span className="text-gray-400 font-normal">(opsional)</span>
          </label>
          <input
            id="photo-caption"
            type="text"
            maxLength={300}
            value={values.caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            disabled={uploading}
            placeholder="Keterangan singkat tentang foto ini…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-brand-black placeholder-gray-400 transition-colors focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={uploading}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={uploading}
            disabled={!values.file}
          >
            Upload Foto
          </Button>
        </div>
      </form>
    </div>
  );
}

interface AlbumCardProps {
  album: AlbumWithPhotos;
  isSelected: boolean;
  isDeleting: boolean;
  isConfirmingDelete: boolean;
  deletingPhotoId: string | null;
  confirmDeletePhotoId: string | null;
  onSelectForUpload: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onConfirmDeletePhoto: (photoId: string) => void;
  onCancelDeletePhoto: () => void;
  onDeletePhoto: (photoId: string) => void;
  supabaseUrl: string;
}

function AlbumCard({
  album,
  isSelected,
  isDeleting,
  isConfirmingDelete,
  deletingPhotoId,
  confirmDeletePhotoId,
  onSelectForUpload,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
  onConfirmDeletePhoto,
  onCancelDeletePhoto,
  onDeletePhoto,
  supabaseUrl,
}: AlbumCardProps) {
  function getPhotoUrl(path: string): string {
    return `${supabaseUrl}/storage/v1/object/public/gallery/${path}`;
  }

  return (
    <li
      className={[
        "rounded-xl border bg-white transition-colors",
        isSelected ? "border-brand-green shadow-sm" : "border-gray-200",
        isDeleting ? "opacity-50" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-busy={isDeleting}
    >
      {/* Album header */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-brand-black">{album.name}</h3>
          {album.description && (
            <p className="mt-0.5 text-sm text-gray-500">{album.description}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Dibuat {formatDate(album.created_at)} · {album.photos.length} foto
          </p>
        </div>

        {/* Album actions */}
        {isConfirmingDelete ? (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-album-heading-${album.id}`}
            aria-describedby={`delete-album-desc-${album.id}`}
            className="rounded-lg border border-red-200 bg-red-50 p-3"
          >
            <p id={`delete-album-heading-${album.id}`} className="text-sm font-semibold text-red-800">
              Hapus album ini?
            </p>
            <p id={`delete-album-desc-${album.id}`} className="mt-0.5 text-xs text-red-700">
              Semua {album.photos.length} foto dalam album akan ikut terhapus permanen.
            </p>
            <div className="mt-2 flex gap-2">
              <Button type="button" variant="danger" size="sm" onClick={onDelete}>
                Ya, Hapus
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={onCancelDelete}>
                Batal
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant={isSelected ? "secondary" : "primary"}
              size="sm"
              disabled={isDeleting}
              onClick={onSelectForUpload}
              aria-label={isSelected ? `Batal upload ke album: ${album.name}` : `Upload foto ke album: ${album.name}`}
            >
              {isSelected ? "Batal Upload" : "Upload Foto"}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={isDeleting}
              onClick={onConfirmDelete}
              aria-label={`Hapus album: ${album.name}`}
            >
              Hapus
            </Button>
          </div>
        )}
      </div>

      {/* Photo grid */}
      {album.photos.length > 0 ? (
        <div className="border-t border-gray-100 p-4">
          <ul
            role="list"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            aria-label={`Foto dalam album ${album.name}`}
          >
            {album.photos.map((photo) => {
              const isDeletingThis = deletingPhotoId === photo.id;
              const isConfirmingDeleteThis = confirmDeletePhotoId === photo.id;

              return (
                <li
                  key={photo.id}
                  className={[
                    "group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50",
                    isDeletingThis ? "opacity-50" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-busy={isDeletingThis}
                >
                  {/* Thumbnail */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPhotoUrl(photo.url)}
                    alt={photo.caption ?? `Foto di album ${album.name}`}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />

                  {/* Caption overlay */}
                  {photo.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                      <p className="line-clamp-2 text-xs text-white">{photo.caption}</p>
                    </div>
                  )}

                  {/* Delete button / confirm */}
                  {isConfirmingDeleteThis ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/70 p-2">
                      <p className="text-center text-xs font-medium text-white">Hapus foto ini?</p>
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          className="px-2 py-1 text-xs min-h-[36px]"
                          onClick={() => onDeletePhoto(photo.id)}
                        >
                          Hapus
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="px-2 py-1 text-xs min-h-[36px]"
                          onClick={onCancelDeletePhoto}
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onConfirmDeletePhoto(photo.id)}
                      disabled={isDeletingThis}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white opacity-0 transition-opacity hover:bg-red-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1 group-hover:opacity-100 disabled:cursor-not-allowed"
                      aria-label={`Hapus foto${photo.caption ? `: ${photo.caption}` : ""}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                        <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                      </svg>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="border-t border-gray-100 px-4 py-6 text-center">
          <p className="text-sm text-gray-400">Belum ada foto di album ini.</p>
        </div>
      )}
    </li>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Halaman kelola galeri admin.
 *
 * Requirements: 4.3, 4.6
 */
export default function AdminGaleriPage() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadAlbums = useCallback(async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const res = await fetch("/api/admin/gallery/albums");
      const json = await res.json();

      if (!res.ok || !json.success) {
        dispatch({
          type: "LOAD_ERROR",
          error: json.message ?? "Gagal memuat data galeri.",
        });
        return;
      }

      dispatch({ type: "LOAD_SUCCESS", albums: json.data });
    } catch {
      dispatch({
        type: "LOAD_ERROR",
        error: "Terjadi kesalahan jaringan. Silakan muat ulang halaman.",
      });
    }
  }, []);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  // Fokus ke input nama saat form album dibuka
  useEffect(() => {
    if (state.albumFormOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [state.albumFormOpen]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAlbumFieldChange = useCallback(
    (field: keyof AlbumFormValues, value: string) => {
      dispatch({ type: "SET_ALBUM_FIELD", field, value });
    },
    []
  );

  const handleAlbumSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const { name, description } = state.albumFormValues;

      if (!name.trim()) {
        dispatch({ type: "ALBUM_SUBMIT_ERROR", error: "Nama album tidak boleh kosong." });
        return;
      }

      dispatch({ type: "ALBUM_SUBMIT_START" });

      try {
        const res = await fetch("/api/admin/gallery/albums", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
          }),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          dispatch({
            type: "ALBUM_SUBMIT_ERROR",
            error: json.message ?? "Gagal membuat album.",
          });
          return;
        }

        // New album has no photos yet
        dispatch({
          type: "ALBUM_SUBMIT_SUCCESS",
          album: { ...json.data, photos: [] },
        });
      } catch {
        dispatch({
          type: "ALBUM_SUBMIT_ERROR",
          error: "Terjadi kesalahan jaringan. Silakan coba lagi.",
        });
      }
    },
    [state.albumFormValues]
  );

  const handlePhotoUpload = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const { file, caption } = state.photoUploadValues;
      const albumId = state.selectedAlbumId;

      if (!file || !albumId) return;

      // Client-side validation
      const validationError = validateFile(file);
      if (validationError) {
        dispatch({ type: "PHOTO_UPLOAD_ERROR", error: validationError });
        return;
      }

      dispatch({ type: "PHOTO_UPLOAD_START" });

      try {
        const formData = new FormData();
        formData.append("album_id", albumId);
        formData.append("file", file);
        if (caption.trim()) {
          formData.append("caption", caption.trim());
        }

        const res = await fetch("/api/admin/gallery/photos", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          dispatch({
            type: "PHOTO_UPLOAD_ERROR",
            error: json.message ?? "Gagal mengupload foto.",
          });
          return;
        }

        dispatch({
          type: "PHOTO_UPLOAD_SUCCESS",
          albumId,
          photo: json.data,
        });

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch {
        dispatch({
          type: "PHOTO_UPLOAD_ERROR",
          error: "Terjadi kesalahan jaringan. Silakan coba lagi.",
        });
      }
    },
    [state.photoUploadValues, state.selectedAlbumId]
  );

  const handleDeleteAlbum = useCallback(async (id: string) => {
    dispatch({ type: "DELETE_ALBUM_START", id });
    try {
      const res = await fetch(`/api/admin/gallery/albums?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        dispatch({
          type: "DELETE_ALBUM_ERROR",
          error: json.message ?? "Gagal menghapus album.",
        });
        return;
      }

      dispatch({ type: "DELETE_ALBUM_SUCCESS", id });
    } catch {
      dispatch({
        type: "DELETE_ALBUM_ERROR",
        error: "Terjadi kesalahan jaringan saat menghapus album.",
      });
    }
  }, []);

  const handleDeletePhoto = useCallback(async (photoId: string, albumId: string) => {
    dispatch({ type: "DELETE_PHOTO_START", id: photoId });
    try {
      const res = await fetch(`/api/admin/gallery/photos?id=${photoId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        dispatch({
          type: "DELETE_PHOTO_ERROR",
          error: json.message ?? "Gagal menghapus foto.",
        });
        return;
      }

      dispatch({ type: "DELETE_PHOTO_SUCCESS", albumId, photoId });
    } catch {
      dispatch({
        type: "DELETE_PHOTO_ERROR",
        error: "Terjadi kesalahan jaringan saat menghapus foto.",
      });
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  const selectedAlbum = state.selectedAlbumId
    ? state.albums.find((a) => a.id === state.selectedAlbumId) ?? null
    : null;

  return (
    <div className="space-y-6">
      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-black">Galeri</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola album dan foto dokumentasi acara perumahan.
          </p>
        </div>
        {!state.albumFormOpen && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => dispatch({ type: "OPEN_ALBUM_FORM" })}
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
            Buat Album
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

      {/* ── Form buat album ───────────────────────────────────────── */}
      {state.albumFormOpen && (
        <AlbumForm
          values={state.albumFormValues}
          submitting={state.albumFormSubmitting}
          error={state.albumFormError}
          onFieldChange={handleAlbumFieldChange}
          onSubmit={handleAlbumSubmit}
          onCancel={() => dispatch({ type: "CLOSE_ALBUM_FORM" })}
          nameInputRef={nameInputRef}
        />
      )}

      {/* ── Photo upload section ──────────────────────────────────── */}
      {selectedAlbum && (
        <PhotoUploadSection
          album={selectedAlbum}
          values={state.photoUploadValues}
          uploading={state.photoUploading}
          error={state.photoUploadError}
          onFileChange={(file) => dispatch({ type: "SET_PHOTO_FILE", file })}
          onCaptionChange={(caption) => dispatch({ type: "SET_PHOTO_CAPTION", caption })}
          onUpload={handlePhotoUpload}
          onClose={() => dispatch({ type: "DESELECT_ALBUM" })}
          fileInputRef={fileInputRef}
        />
      )}

      {/* ── Loading skeleton ──────────────────────────────────────── */}
      {state.loading && (
        <div className="space-y-3" aria-busy="true" aria-label="Memuat galeri">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-gray-100"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {!state.loading && state.albums.length === 0 && !state.error && (
        <EmptyState
          title="Belum ada album"
          description="Buat album pertama untuk mulai mengupload foto dokumentasi acara."
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          }
          action={
            !state.albumFormOpen ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => dispatch({ type: "OPEN_ALBUM_FORM" })}
              >
                Buat Album
              </Button>
            ) : undefined
          }
        />
      )}

      {/* ── Daftar album ──────────────────────────────────────────── */}
      {!state.loading && state.albums.length > 0 && (
        <section aria-labelledby="albums-heading">
          <h2 id="albums-heading" className="sr-only">
            Daftar album
          </h2>
          <ul role="list" className="space-y-4">
            {state.albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                isSelected={state.selectedAlbumId === album.id}
                isDeleting={state.deletingAlbumId === album.id}
                isConfirmingDelete={state.confirmDeleteAlbumId === album.id}
                deletingPhotoId={state.deletingPhotoId}
                confirmDeletePhotoId={state.confirmDeletePhotoId}
                onSelectForUpload={() => {
                  if (state.selectedAlbumId === album.id) {
                    dispatch({ type: "DESELECT_ALBUM" });
                  } else {
                    dispatch({ type: "SELECT_ALBUM", albumId: album.id });
                  }
                }}
                onConfirmDelete={() => dispatch({ type: "CONFIRM_DELETE_ALBUM", id: album.id })}
                onCancelDelete={() => dispatch({ type: "CANCEL_DELETE_ALBUM" })}
                onDelete={() => handleDeleteAlbum(album.id)}
                onConfirmDeletePhoto={(photoId) => dispatch({ type: "CONFIRM_DELETE_PHOTO", id: photoId })}
                onCancelDeletePhoto={() => dispatch({ type: "CANCEL_DELETE_PHOTO" })}
                onDeletePhoto={(photoId) => handleDeletePhoto(photoId, album.id)}
                supabaseUrl={supabaseUrl}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
