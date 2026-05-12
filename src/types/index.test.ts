import { describe, it, expect } from "vitest";
import type {
  Profile,
  Announcement,
  GalleryAlbum,
  GalleryPhoto,
  Poll,
  PollOption,
  PollVote,
  PollResult,
  PollWithResults,
  FinanceRow,
  FinanceData,
} from "./index";

// Smoke test: verify all types are importable and structurally correct
describe("TypeScript types", () => {
  it("Profile type has required fields", () => {
    const profile: Profile = {
      id: "uuid-1",
      name: "Budi Santoso",
      role: "admin",
      gang: null,
      created_at: "2024-01-01T00:00:00Z",
    };
    expect(profile.role).toBe("admin");
  });

  it("Announcement type has required fields", () => {
    const announcement: Announcement = {
      id: "uuid-2",
      title: "Pengumuman Rapat",
      body: "Rapat warga akan diadakan...",
      priority: "normal",
      created_by: "uuid-1",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: null,
    };
    expect(announcement.priority).toBe("normal");
  });

  it("Poll type supports public and gang types", () => {
    const publicPoll: Poll = {
      id: "uuid-3",
      title: "Pilih Ketua RT",
      description: null,
      type: "public",
      gang_scope: null,
      secret_token: null,
      status: "active",
      closes_at: null,
      created_by: "uuid-1",
      created_at: "2024-01-01T00:00:00Z",
    };
    expect(publicPoll.type).toBe("public");

    const gangPoll: Poll = {
      ...publicPoll,
      id: "uuid-4",
      type: "gang",
      gang_scope: "Gang 1",
      secret_token: "abc123def456",
    };
    expect(gangPoll.type).toBe("gang");
  });

  it("PollWithResults extends Poll with options, results, and total_votes", () => {
    const result: PollResult = {
      option_id: "opt-1",
      label: "Setuju",
      vote_count: 10,
      percentage: 100.0,
    };
    const pollWithResults: PollWithResults = {
      id: "uuid-5",
      title: "Test Poll",
      description: null,
      type: "public",
      gang_scope: null,
      secret_token: null,
      status: "closed",
      closes_at: null,
      created_by: "uuid-1",
      created_at: "2024-01-01T00:00:00Z",
      options: [],
      results: [result],
      total_votes: 10,
    };
    expect(pollWithResults.total_votes).toBe(10);
  });

  it("FinanceData has correct structure", () => {
    const row: FinanceRow = {
      tanggal: "2024-01-01",
      keterangan: "Iuran warga",
      pemasukan: 500000,
      pengeluaran: null,
      saldo: 500000,
    };
    const data: FinanceData = {
      rows: [row],
      last_updated: "2024-01-01T00:00:00Z",
      from_cache: false,
      available_sheets: ["Januari 2024"],
    };
    expect(data.rows).toHaveLength(1);
    expect(data.from_cache).toBe(false);
  });
});
