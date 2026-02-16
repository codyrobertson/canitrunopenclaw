import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getAllForksCached,
  getCategoriesCached,
  getDevicesRankedAllCached,
  getDevicesRankedFilteredCached,
} from "@/lib/queries-cached";
import { createFilterAwareMetadata } from "@/lib/seo/listings";
import { buildBreadcrumbList, buildSchemaGraph } from "@/lib/seo/schema";
import { DeviceCard } from "@/components/device-card";
import { SearchBar } from "@/components/search-bar";
import { FilterToggle } from "@/components/filter-toggle";
import { JsonLd } from "@/components/json-ld";
import Link from "next/link";

type DeviceFilters = {
  q?: string;
  category?: string;
  fork?: string;
  maxPrice?: string;
};

function normalizeDeviceFilters(params: DeviceFilters) {
  return {
    search: params.q?.trim() || undefined,
    category: params.category?.trim() || undefined,
    forkSlug: params.fork?.trim() || undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<DeviceFilters>;
}): Promise<Metadata> {
  const params = await searchParams;
  const hasFilters = Boolean(params.q || params.category || params.fork || params.maxPrice);

  const titleParts: string[] = [];
  if (params.category) titleParts.push(`${params.category} Devices`);
  else titleParts.push("All Devices");
  titleParts.push("for OpenClaw");

  const title = titleParts.join(" ");
  const description = hasFilters
    ? `Browse filtered ${params.category ? params.category.toLowerCase() + " " : ""}devices compatible with OpenClaw and its forks. Community-tested hardware compatibility verdicts.`
    : `Browse ${(await getDevicesRankedAllCached()).length} devices compatible with OpenClaw and its forks. Community-tested hardware compatibility verdicts.`;

  return createFilterAwareMetadata({
    title,
    description,
    basePath: "/devices",
    hasFilters,
  });
}

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<DeviceFilters>;
}) {
  const params = await searchParams;
  const hasFilters = Boolean(params.q || params.category || params.fork || params.maxPrice);
  const filters = normalizeDeviceFilters(params);
  const [devices, categories, forks] = await Promise.all([
    hasFilters ? getDevicesRankedFilteredCached(filters) : getDevicesRankedAllCached(),
    getCategoriesCached(),
    getAllForksCached(),
  ]);

  const jsonLd = buildSchemaGraph([
    buildBreadcrumbList([
      { name: "Home", path: "/" },
      { name: "Devices", path: "/devices" },
    ]),
  ]);

  const filterContent = (
    <div className="space-y-6">
      <div><Suspense fallback={<div className="h-[42px] rounded-xl bg-ocean-50 animate-pulse" />}><SearchBar placeholder="Search..." /></Suspense></div>
      <div>
        <h3 className="text-sm font-semibold text-navy mb-2">Category</h3>
        <div className="space-y-1">
          <Link href="/devices" className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${!params.category ? "bg-ocean-100 text-ocean-800 font-medium" : "text-navy-light hover:bg-ocean-50"}`}>All</Link>
          {categories.map((cat) => (
            <Link key={cat} href={`/devices?category=${cat}${params.q ? `&q=${params.q}` : ""}`} className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${params.category === cat ? "bg-ocean-100 text-ocean-800 font-medium" : "text-navy-light hover:bg-ocean-50"}`}>{cat}</Link>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-navy mb-2">Compatible Fork</h3>
        <div className="space-y-1">
          <Link href={`/devices${params.category ? `?category=${params.category}` : ""}`} className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${!params.fork ? "bg-ocean-100 text-ocean-800 font-medium" : "text-navy-light hover:bg-ocean-50"}`}>All Forks</Link>
          {forks.map((fork) => (
            <Link key={fork.id} href={`/devices?fork=${fork.slug}${params.category ? `&category=${params.category}` : ""}${params.q ? `&q=${params.q}` : ""}`} className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${params.fork === fork.slug ? "bg-ocean-100 text-ocean-800 font-medium" : "text-navy-light hover:bg-ocean-50"}`}>{fork.name}</Link>
          ))}
        </div>
      </div>
    </div>
  );

  const hasActiveFilters = !!(params.category || params.fork || params.q);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <JsonLd data={jsonLd} />
      <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy mb-4 sm:mb-6">All Devices</h1>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Filters Sidebar - hidden on mobile behind toggle */}
        <aside className="shrink-0 lg:w-64">
          {/* Desktop sidebar */}
          <div className="hidden lg:block rounded-xl border border-ocean-200 bg-white p-5 sticky top-24">
            {filterContent}
          </div>
          {/* Mobile filter toggle */}
          <div className="lg:hidden">
            <FilterToggle hasActiveFilters={hasActiveFilters}>
              {filterContent}
            </FilterToggle>
          </div>
        </aside>
        {/* Device Grid */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-navy-light mb-4">{devices.length} device{devices.length !== 1 ? "s" : ""} found</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {devices.map((device) => (<DeviceCard key={device.id} device={device} />))}
          </div>
          {devices.length === 0 && (
            <div className="text-center py-12 text-navy-light">
              <p className="text-lg">No devices match your filters.</p>
              <Link href="/devices" className="mt-2 text-ocean-800 hover:underline">Clear filters</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
