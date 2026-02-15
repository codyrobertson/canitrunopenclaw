export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify is deterministic here; keep it inline so pages can compose graphs.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
