import { and, eq, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { seoFingerprints } from "@/lib/schema";

import type { DuplicateDetector, DuplicateMatch, SeoFingerprint } from "./guardrails";

export type NeonDuplicateDetectorOptions = {
  // Max Hamming distance (0-64) for simhash near-duplicate detection.
  // Set to 0 to disable near-duplicate checks (exact duplicates still handled).
  nearDistance?: number;
  candidateLimit?: number;
};

function normalizeCanonicalPath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function hexBand16(hex16: string, start: number): number {
  const slice = hex16.slice(start, start + 4);
  return Number.parseInt(slice, 16);
}

function simhashBands(simhash64: string): { band0: number; band1: number; band2: number; band3: number } {
  const hex = simhash64.padStart(16, "0").slice(-16);
  return {
    band0: hexBand16(hex, 0),
    band1: hexBand16(hex, 4),
    band2: hexBand16(hex, 8),
    band3: hexBand16(hex, 12),
  };
}

function hammingDistance64Hex(a: string, b: string): number {
  const aHex = a.padStart(16, "0").slice(-16);
  const bHex = b.padStart(16, "0").slice(-16);
  let x = BigInt(`0x${aHex}`) ^ BigInt(`0x${bHex}`);
  let dist = 0;
  while (x) {
    // Brian Kernighan's bit count.
    x &= x - 1n;
    dist++;
  }
  return dist;
}

export function createNeonDuplicateDetector(
  pageType: string,
  options?: NeonDuplicateDetectorOptions
): DuplicateDetector {
  const nearDistance = options?.nearDistance ?? 0;
  const candidateLimit = options?.candidateLimit ?? 40;

  return {
    async findDuplicate(args: { canonicalPath: string; fingerprint: SeoFingerprint }): Promise<DuplicateMatch | null> {
      const canonicalPath = normalizeCanonicalPath(args.canonicalPath);
      const bands = simhashBands(args.fingerprint.simhash64);

      let nearMatch: { canonicalPath: string; distance: number } | null = null;
      if (nearDistance > 0) {
        const candidates = await db
          .select({
            canonical_path: seoFingerprints.canonical_path,
            simhash64: seoFingerprints.simhash64,
          })
          .from(seoFingerprints)
          .where(
            and(
              eq(seoFingerprints.page_type, pageType),
              // Avoid self-matching on re-generation.
              sql`${seoFingerprints.exact_hash} <> ${args.fingerprint.exactHash}`,
              or(
                eq(seoFingerprints.simhash_band0, bands.band0),
                eq(seoFingerprints.simhash_band1, bands.band1),
                eq(seoFingerprints.simhash_band2, bands.band2),
                eq(seoFingerprints.simhash_band3, bands.band3)
              )
            )
          )
          .limit(candidateLimit);

        for (const c of candidates) {
          const dist = hammingDistance64Hex(args.fingerprint.simhash64, c.simhash64);
          if (dist > nearDistance) continue;

          const candidateCanonical = normalizeCanonicalPath(c.canonical_path);
          if (candidateCanonical === canonicalPath) continue;

          if (!nearMatch || dist < nearMatch.distance) {
            nearMatch = { canonicalPath: candidateCanonical, distance: dist };
          }
        }
      }

      const preferredCanonicalPath = nearMatch?.canonicalPath ?? canonicalPath;

      // Upsert the content hash mapping. canonical_path is intentionally stable:
      // once set for an exact_hash, we keep it to avoid flip-flopping canonicals.
      const [row] = await db
        .insert(seoFingerprints)
        .values({
          page_type: pageType,
          canonical_path: preferredCanonicalPath,
          exact_hash: args.fingerprint.exactHash,
          simhash64: args.fingerprint.simhash64,
          simhash_band0: bands.band0,
          simhash_band1: bands.band1,
          simhash_band2: bands.band2,
          simhash_band3: bands.band3,
          word_count: args.fingerprint.wordCount,
          updated_at: sql`now()`,
        })
        .onConflictDoUpdate({
          target: [seoFingerprints.page_type, seoFingerprints.exact_hash],
          set: {
            canonical_path: sql`${seoFingerprints.canonical_path}`,
            simhash64: args.fingerprint.simhash64,
            simhash_band0: bands.band0,
            simhash_band1: bands.band1,
            simhash_band2: bands.band2,
            simhash_band3: bands.band3,
            word_count: args.fingerprint.wordCount,
            updated_at: sql`now()`,
          },
        })
        .returning({ canonical_path: seoFingerprints.canonical_path });

      const storedCanonicalPath = normalizeCanonicalPath(row?.canonical_path ?? preferredCanonicalPath);
      if (storedCanonicalPath === canonicalPath) return null;

      if (nearMatch && storedCanonicalPath === preferredCanonicalPath) {
        return { type: "near", canonicalPath: storedCanonicalPath, distance: nearMatch.distance };
      }
      return { type: "exact", canonicalPath: storedCanonicalPath };
    },
  };
}
