import { describe, test, expect, vi, beforeEach } from "vitest";
import { generateFingerprint, hashFingerprint } from "./fingerprint";

// Mock browser globals yang tidak tersedia di jsdom secara default
beforeEach(() => {
  // Mock navigator
  Object.defineProperty(globalThis, "navigator", {
    value: {
      userAgent: "Mozilla/5.0 (Test Browser)",
      language: "id-ID",
      hardwareConcurrency: 4,
      platform: "Linux x86_64",
    },
    writable: true,
    configurable: true,
  });

  // Mock screen
  Object.defineProperty(globalThis, "screen", {
    value: {
      width: 1920,
      height: 1080,
      colorDepth: 24,
    },
    writable: true,
    configurable: true,
  });

  // Mock Intl.DateTimeFormat
  vi.spyOn(Intl, "DateTimeFormat").mockReturnValue({
    resolvedOptions: () => ({ timeZone: "Asia/Jakarta" }),
  } as unknown as Intl.DateTimeFormat);
});

describe("generateFingerprint", () => {
  test("menghasilkan string non-kosong", () => {
    const fp = generateFingerprint();
    expect(fp).toBeTruthy();
    expect(typeof fp).toBe("string");
    expect(fp.length).toBeGreaterThan(0);
  });

  test("mengandung komponen browser yang digabungkan dengan separator |", () => {
    const fp = generateFingerprint();
    expect(fp).toContain("|");
    // Harus mengandung user agent
    expect(fp).toContain("Mozilla/5.0 (Test Browser)");
    // Harus mengandung bahasa
    expect(fp).toContain("id-ID");
    // Harus mengandung timezone
    expect(fp).toContain("Asia/Jakarta");
    // Harus mengandung resolusi layar
    expect(fp).toContain("1920x1080");
  });

  test("deterministik — menghasilkan output sama untuk kondisi browser sama", () => {
    const fp1 = generateFingerprint();
    const fp2 = generateFingerprint();
    expect(fp1).toBe(fp2);
  });
});

describe("hashFingerprint", () => {
  test("menghasilkan string 64 karakter", async () => {
    const hash = await hashFingerprint("test-input");
    expect(hash).toHaveLength(64);
  });

  test("output hanya mengandung karakter hex lowercase", async () => {
    const hash = await hashFingerprint("test-input");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("deterministik — input sama menghasilkan output sama", async () => {
    const input = "Mozilla/5.0|id-ID|Asia/Jakarta|1920x1080|24|4|Linux x86_64";
    const hash1 = await hashFingerprint(input);
    const hash2 = await hashFingerprint(input);
    expect(hash1).toBe(hash2);
  });

  test("input berbeda menghasilkan hash berbeda", async () => {
    const hash1 = await hashFingerprint("input-pertama");
    const hash2 = await hashFingerprint("input-kedua");
    expect(hash1).not.toBe(hash2);
  });

  test("string kosong menghasilkan hash SHA-256 yang valid", async () => {
    const hash = await hashFingerprint("");
    // SHA-256 dari string kosong adalah nilai yang diketahui
    expect(hash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  test("menghasilkan hash 64 karakter untuk berbagai panjang input", async () => {
    const inputs = [
      "a",
      "hello world",
      "Mozilla/5.0|id-ID|Asia/Jakarta|1920x1080|24|4|Linux x86_64",
      "x".repeat(1000),
    ];

    for (const input of inputs) {
      const hash = await hashFingerprint(input);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
