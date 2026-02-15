import { unstable_cache } from "next/cache";

export type NextCacheOptions = {
  // Seconds, same as Next's ISR revalidate.
  revalidate?: number | false;
  tags?: string[];
};

function shouldUseNextCache(): boolean {
  if (process.env.NODE_ENV === "test") return false;
  if (process.env.VITEST) return false;
  return true;
}

// `unstable_cache` throws outside a real Next runtime (ex: vitest).
// This wrapper keeps DB-backed modules testable while still enabling caching in production.
export async function withNextCache<T>(args: {
  keyParts: string[];
  options?: NextCacheOptions;
  fn: () => Promise<T>;
}): Promise<T> {
  if (!shouldUseNextCache()) return args.fn();

  try {
    const cached = unstable_cache(args.fn, args.keyParts, args.options);
    return await cached();
  } catch {
    return args.fn();
  }
}

