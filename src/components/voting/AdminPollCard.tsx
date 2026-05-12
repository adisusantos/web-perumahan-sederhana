/**
 * Card untuk menampilkan poll di admin panel
 * Menampilkan info poll, status, jumlah votes, dan actions (tutup/copy link)
 */

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Poll, PollOption } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PollOptionWithVotes extends PollOption {
  vote_count?: number;
}

interface PollWithDetails extends Poll {
  poll_options: PollOptionWithVotes[];
  total_votes?: number;
}

interface AdminPollCardProps {
  poll: PollWithDetails;
  onClose: (pollId: string) => void;
  isClosing?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta", // WIB timezone
  });
}

function buildSecretLink(token: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/voting/${token}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AdminPollCard({ poll, onClose, isClosing = false }: AdminPollCardProps) {
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isActive = poll.status === "active";
  const isClosed = poll.status === "closed";
  const totalVotes = poll.total_votes ?? 0;

  // Handler untuk copy secret link
  const handleCopyLink = async () => {
    if (!poll.secret_token) return;

    const link = buildSecretLink(poll.secret_token);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Handler untuk tutup poll
  const handleClose = () => {
    setShowConfirm(false);
    onClose(poll.id);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header: Title + Status Badge */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-brand-black">{poll.title}</h3>
          {poll.description && (
            <p className="mt-1 text-sm text-gray-600">{poll.description}</p>
          )}
        </div>
        <Badge variant={isActive ? "success" : "default"}>
          {isActive ? "Aktif" : "Selesai"}
        </Badge>
      </div>

      {/* Metadata */}
      <div className="mb-4 space-y-1 text-sm text-gray-500">
        <p>
          <span className="font-medium">Tipe:</span>{" "}
          {poll.type === "public" ? "Publik" : `Gang (${poll.gang_scope || "-"})`}
        </p>
        <p>
          <span className="font-medium">Dibuat:</span> {formatDate(poll.created_at)}
        </p>
        {poll.closes_at && (
          <p>
            <span className="font-medium">Tutup otomatis:</span> {formatDate(poll.closes_at)}
          </p>
        )}
        <p>
          <span className="font-medium">Total suara:</span> {totalVotes}
        </p>
      </div>

      {/* Pilihan & Hasil Voting */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-gray-700">
          Pilihan & Hasil:
        </p>
        <div className="space-y-2">
          {poll.poll_options.map((option) => {
            const optionVotes = option.vote_count || 0;
            const percentage = totalVotes > 0 
              ? ((optionVotes / totalVotes) * 100).toFixed(1)
              : '0.0';

            return (
              <div key={option.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{option.label}</span>
                  <span className="text-gray-500">
                    {optionVotes} suara ({percentage}%)
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-brand-green transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {/* Copy Secret Link - hanya untuk poll gang */}
        {poll.type === "gang" && poll.secret_token && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
              <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
            </svg>
            {copied ? "Tersalin!" : "Salin Link"}
          </Button>
        )}

        {/* Tutup Poll - hanya untuk poll aktif */}
        {isActive && !showConfirm && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowConfirm(true)}
            disabled={isClosing}
          >
            Tutup Poll
          </Button>
        )}

        {/* Konfirmasi Tutup */}
        {showConfirm && (
          <div className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="flex-1 text-sm text-amber-800">Yakin tutup poll ini?</p>
            <Button
              variant="danger"
              size="sm"
              onClick={handleClose}
              disabled={isClosing}
              loading={isClosing}
            >
              Ya, Tutup
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirm(false)}
              disabled={isClosing}
            >
              Batal
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
