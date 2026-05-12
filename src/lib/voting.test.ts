import { describe, test, expect } from "vitest";
import { calculatePollResults } from "./voting";

describe("calculatePollResults", () => {
  // ─── Kasus dasar ────────────────────────────────────────────────

  test("menghitung vote_count dengan benar", () => {
    const results = calculatePollResults([30, 70]);
    expect(results[0].vote_count).toBe(30);
    expect(results[1].vote_count).toBe(70);
  });

  test("menghitung total_votes dengan benar", () => {
    const results = calculatePollResults([30, 70]);
    expect(results[0].total_votes).toBe(100);
    expect(results[1].total_votes).toBe(100);
  });

  test("menghitung percentage dengan benar (pembagian merata)", () => {
    const results = calculatePollResults([50, 50]);
    expect(results[0].percentage).toBe(50);
    expect(results[1].percentage).toBe(50);
  });

  test("menghitung percentage dengan benar (tidak merata)", () => {
    const results = calculatePollResults([1, 3]);
    expect(results[0].percentage).toBe(25);
    expect(results[1].percentage).toBe(75);
  });

  test("percentage dibulatkan ke 1 desimal", () => {
    // 1/3 = 33.333... → 33.3
    const results = calculatePollResults([1, 1, 1]);
    expect(results[0].percentage).toBe(33.3);
    expect(results[1].percentage).toBe(33.3);
    expect(results[2].percentage).toBe(33.3);
  });

  test("mengembalikan array dengan panjang sama seperti input", () => {
    expect(calculatePollResults([10, 20, 30]).length).toBe(3);
    expect(calculatePollResults([5]).length).toBe(1);
  });

  // ─── Edge cases ─────────────────────────────────────────────────

  test("semua percentage = 0 jika total suara = 0", () => {
    const results = calculatePollResults([0, 0, 0]);
    results.forEach((r) => {
      expect(r.percentage).toBe(0);
      expect(r.vote_count).toBe(0);
      expect(r.total_votes).toBe(0);
    });
  });

  test("array kosong mengembalikan array kosong", () => {
    expect(calculatePollResults([])).toEqual([]);
  });

  test("satu opsi dengan semua suara → percentage = 100", () => {
    const results = calculatePollResults([42]);
    expect(results[0].percentage).toBe(100);
    expect(results[0].vote_count).toBe(42);
    expect(results[0].total_votes).toBe(42);
  });

  test("satu opsi dengan 0 suara → percentage = 0", () => {
    const results = calculatePollResults([0]);
    expect(results[0].percentage).toBe(0);
    expect(results[0].total_votes).toBe(0);
  });

  // ─── Konsistensi matematis ───────────────────────────────────────

  test("sum(vote_count) === total_votes", () => {
    const voteCounts = [10, 25, 15, 50];
    const results = calculatePollResults(voteCounts);
    const sumVotes = results.reduce((a, r) => a + r.vote_count, 0);
    expect(sumVotes).toBe(results[0].total_votes);
  });

  test("sum(percentage) ≈ 100 (toleransi pembulatan ±0.2)", () => {
    // 1/3 = 33.3 per opsi → 33.3 * 3 = 99.9 (selisih 0.1 dari 100)
    // Toleransi 0.2 untuk mengakomodasi floating point arithmetic
    const voteCounts = [1, 1, 1];
    const results = calculatePollResults(voteCounts);
    const sumPct = results.reduce((a, r) => a + r.percentage, 0);
    expect(Math.abs(sumPct - 100)).toBeLessThanOrEqual(0.2);
  });

  test("total_votes sama untuk semua elemen dalam satu hasil", () => {
    const results = calculatePollResults([10, 20, 30]);
    const totals = results.map((r) => r.total_votes);
    expect(new Set(totals).size).toBe(1); // semua sama
  });
});
