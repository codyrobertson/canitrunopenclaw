import crypto from "node:crypto";

export type SeoFaqItem = { question: string; answer: string };

export type SeoTextContent = {
  title: string;
  description?: string;
  h1?: string;
  headings?: string[];
  body?: string;
  faqs?: SeoFaqItem[];
};

export type SeoGuardrailsPolicy = {
  // Word count is computed over the normalized SEO text payload (title/desc/headings/faqs/body).
  // Set to 0 to disable thin-content gating.
  minWords?: number;
};

export type SeoFingerprint = {
  normalizedText: string;
  wordCount: number;
  exactHash: string; // sha256 hex
  simhash64: string; // 16-char hex
};

export type DuplicateMatch =
  | { type: "exact"; canonicalPath: string }
  | { type: "near"; canonicalPath: string; distance: number };

export type DuplicateDetector = {
  findDuplicate(args: {
    canonicalPath: string;
    fingerprint: SeoFingerprint;
  }): Promise<DuplicateMatch | null>;
};

export type SeoGuardrailDecision = {
  indexable: boolean;
  canonicalPath: string;
  reasons: string[];
  fingerprint: SeoFingerprint;
};

export type EvaluateSeoGuardrailsArgs = {
  canonicalPath: string;
  requestedIndexable?: boolean;
  content: SeoTextContent;
  policy?: SeoGuardrailsPolicy;
  duplicateDetector?: DuplicateDetector;
};

function normalizeCanonicalPath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function normalizeText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ") // strip HTML
    .replace(/[\u0000-\u001F\u007F]/g, " ") // strip control chars
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildNormalizedSeoText(content: SeoTextContent): string {
  const parts: string[] = [];
  parts.push(content.title);
  if (content.description) parts.push(content.description);
  if (content.h1) parts.push(content.h1);
  if (content.headings?.length) parts.push(content.headings.join(" "));
  if (content.faqs?.length) {
    for (const faq of content.faqs) {
      parts.push(faq.question);
      parts.push(faq.answer);
    }
  }
  if (content.body) parts.push(content.body);

  return normalizeText(parts.join(" "));
}

function countWords(normalized: string): number {
  if (!normalized) return 0;
  return normalized.split(" ").filter(Boolean).length;
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

// Simple, deterministic 64-bit FNV-1a for token hashing.
function fnv1a64(token: string): bigint {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < token.length; i++) {
    hash ^= BigInt(token.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash;
}

function simhash64Hex(normalized: string): string {
  const weights = new Array<number>(64).fill(0);
  const tokens = normalized.split(" ").filter(Boolean);

  for (const token of tokens) {
    const h = fnv1a64(token);
    for (let bit = 0; bit < 64; bit++) {
      const mask = 1n << BigInt(bit);
      weights[bit] += (h & mask) === 0n ? -1 : 1;
    }
  }

  let out = 0n;
  for (let bit = 0; bit < 64; bit++) {
    if (weights[bit] > 0) out |= 1n << BigInt(bit);
  }

  return out.toString(16).padStart(16, "0");
}

export async function evaluateSeoGuardrails(args: EvaluateSeoGuardrailsArgs): Promise<SeoGuardrailDecision> {
  const canonicalPath = normalizeCanonicalPath(args.canonicalPath);
  const requestedIndexable = args.requestedIndexable ?? true;
  const minWords = args.policy?.minWords ?? 0;

  const normalizedText = buildNormalizedSeoText(args.content);
  const fingerprint: SeoFingerprint = {
    normalizedText,
    wordCount: countWords(normalizedText),
    exactHash: sha256Hex(normalizedText),
    simhash64: simhash64Hex(normalizedText),
  };

  let indexable = requestedIndexable;
  let effectiveCanonicalPath = canonicalPath;
  const reasons: string[] = [];

  if (indexable && minWords > 0 && fingerprint.wordCount < minWords) {
    indexable = false;
    reasons.push("thin_content");
  }

  if (indexable && args.duplicateDetector) {
    const match = await args.duplicateDetector.findDuplicate({
      canonicalPath,
      fingerprint,
    });
    if (match) {
      indexable = false;
      effectiveCanonicalPath = normalizeCanonicalPath(match.canonicalPath);
      reasons.push(match.type === "exact" ? "duplicate_exact" : "duplicate_near");
    }
  }

  return {
    indexable,
    canonicalPath: effectiveCanonicalPath,
    reasons,
    fingerprint,
  };
}

