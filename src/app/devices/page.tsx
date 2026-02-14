import { getDevicesRanked, getCategories, getAllForks } from "@/lib/queries";
import { DeviceCard } from "@/components/device-card";
import { SearchBar } from "@/components/search-bar";
import Link from "next/link";

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; fork?: string; maxPrice?: string }>;
}) {
  const params = await searchParams;
  const devices = getDevicesRanked({
    search: params.q,
    category: params.category,
    forkSlug: params.fork,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
  });
  const categories = getCategories();
  const forks = getAllForks();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-heading text-3xl font-bold text-navy mb-6">All Devices</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <div className="rounded-xl border border-ocean-200 bg-white p-5 space-y-6 sticky top-24">
            <div><SearchBar placeholder="Search..." /></div>
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
        </aside>
        {/* Device Grid */}
        <div className="flex-1">
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
