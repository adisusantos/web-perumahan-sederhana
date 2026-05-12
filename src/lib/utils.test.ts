import { describe, test, expect } from "vitest";
import { generateSecretToken } from "./utils";

describe("generateSecretToken", () => {
  test("menghasilkan token tepat 12 karakter", () => {
    const token = generateSecretToken();
    expect(token).toHaveLength(12);
  });

  test("hanya mengandung karakter alfanumerik URL-safe", () => {
    const token = generateSecretToken();
    expect(token).toMatch(/^[A-Za-z0-9]{12}$/);
  });

  test("menghasilkan token berbeda setiap kali dipanggil", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateSecretToken()));
    // Dengan 62^12 kemungkinan, probabilitas collision sangat kecil
    expect(tokens.size).toBeGreaterThan(1);
  });

  test("tidak mengandung karakter spesial atau spasi", () => {
    for (let i = 0; i < 50; i++) {
      const token = generateSecretToken();
      expect(token).not.toMatch(/[^A-Za-z0-9]/);
    }
  });

  test("menghasilkan token yang konsisten dalam format", () => {
    for (let i = 0; i < 20; i++) {
      const token = generateSecretToken();
      expect(token.length).toBe(12);
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
    }
  });
});
