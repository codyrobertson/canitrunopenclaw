import type { Metadata } from "next";

export type CreateMetadataArgs = {
  title: string;
  description: string;
  canonicalPath: string;
  indexable?: boolean;
  follow?: boolean;
  openGraph?: NonNullable<Metadata["openGraph"]>;
  twitter?: NonNullable<Metadata["twitter"]>;
};

function normalizeCanonicalPath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

// Central place to enforce canonical policy.
// For now: query-param pages canon to the clean path.
export function buildCanonicalPath(
  path: string,
  searchParams?: Record<string, string | string[] | undefined | null>
): string {
  void searchParams;
  return normalizeCanonicalPath(path);
}

export function createMetadata(args: CreateMetadataArgs): Metadata {
  const canonicalPath = normalizeCanonicalPath(args.canonicalPath);
  const indexable = args.indexable ?? true;
  const follow = args.follow ?? true;

  const robots: Metadata["robots"] = indexable
    ? { index: true, follow }
    : { index: false, follow };

  return {
    title: args.title,
    description: args.description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      title: args.title,
      description: args.description,
      url: canonicalPath,
      ...(args.openGraph ?? {}),
    },
    twitter: {
      card: "summary_large_image",
      title: args.title,
      description: args.description,
      ...(args.twitter ?? {}),
    },
    robots,
  };
}
