import type { Metadata } from "next";

import { createMetadata } from "./metadata";

export type FilterAwareMetadataArgs = {
  title: string;
  description: string;
  basePath: string;
  hasFilters: boolean;
};

// Listings with query params are the biggest source of index bloat + cannibalization.
// Policy: index only the clean base path, but still allow rich previews for shared links.
export function createFilterAwareMetadata(args: FilterAwareMetadataArgs): Metadata {
  return createMetadata({
    title: args.title,
    description: args.description,
    canonicalPath: args.basePath,
    indexable: !args.hasFilters,
  });
}
