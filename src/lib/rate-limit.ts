// Simple sliding window rate limiter
// No external dependencies needed
const requests = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get existing timestamps or create empty array
  const timestamps = requests.get(key) ?? [];

  // Remove entries outside the current window
  const valid = timestamps.filter((t) => t > windowStart);

  if (valid.length >= limit) {
    requests.set(key, valid);
    return { success: false, remaining: 0 };
  }

  valid.push(now);
  requests.set(key, valid);

  return { success: true, remaining: limit - valid.length };
}

/**
 * Periodic cleanup to prevent memory leaks in long-running processes.
 * Removes keys whose newest timestamp is older than the given maxAge.
 */
export function cleanupRateLimiter(maxAgeMs: number = 120_000): void {
  const now = Date.now();
  for (const [key, timestamps] of requests) {
    const newest = timestamps[timestamps.length - 1] ?? 0;
    if (now - newest > maxAgeMs) {
      requests.delete(key);
    }
  }
}

// Run cleanup every 2 minutes
if (typeof globalThis !== "undefined" && typeof setInterval !== "undefined") {
  setInterval(() => cleanupRateLimiter(), 120_000).unref?.();
}
