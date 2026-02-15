import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    // Use a unique key prefix per test to avoid cross-test pollution
    vi.restoreAllMocks();
  });

  it("allows requests under the limit", () => {
    const key = `test-allow-${Date.now()}`;
    const result1 = rateLimit(key, 5, 60_000);
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(4);

    const result2 = rateLimit(key, 5, 60_000);
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(3);
  });

  it("blocks requests over the limit", () => {
    const key = `test-block-${Date.now()}`;
    const limit = 3;

    for (let i = 0; i < limit; i++) {
      const result = rateLimit(key, limit, 60_000);
      expect(result.success).toBe(true);
    }

    const blocked = rateLimit(key, limit, 60_000);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    const key = `test-reset-${Date.now()}`;
    const windowMs = 100; // 100ms window for fast testing

    // Fill up the limit
    rateLimit(key, 2, windowMs);
    rateLimit(key, 2, windowMs);

    const blocked = rateLimit(key, 2, windowMs);
    expect(blocked.success).toBe(false);

    // Wait for the window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const afterReset = rateLimit(key, 2, windowMs);
        expect(afterReset.success).toBe(true);
        expect(afterReset.remaining).toBe(1);
        resolve();
      }, windowMs + 20);
    });
  });

  it("returns correct remaining count", () => {
    const key = `test-remaining-${Date.now()}`;
    const limit = 5;

    for (let i = 0; i < limit; i++) {
      const result = rateLimit(key, limit, 60_000);
      expect(result.remaining).toBe(limit - i - 1);
    }
  });
});
