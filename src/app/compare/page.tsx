import type { Metadata } from "next";
import { getDevicesRankedAllCached, getVerdictsByDeviceCached } from "@/lib/queries-cached";
import { createFilterAwareMetadata } from "@/lib/seo/listings";
import { buildBreadcrumbList, buildSchemaGraph } from "@/lib/seo/schema";
import { VerdictBadge } from "@/components/verdict-badge";
import { CompareSelector } from "@/components/compare-selector";
import { JsonLd } from "@/components/json-ld";
import Link from "next/link";
import { ArrowRight, Cpu, MemoryStick, Zap, DollarSign, Monitor } from "lucide-react";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ devices?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const selectedSlugs = params.devices?.split(",").filter(Boolean) ?? [];
  const hasFilters = Boolean(params.devices);

  if (hasFilters && selectedSlugs.length >= 2) {
    const allDevices = await getDevicesRankedAllCached();
    const selectedDevices = selectedSlugs
      .map((slug) => allDevices.find((d) => d.slug === slug))
      .filter(Boolean) as typeof allDevices;

    if (selectedDevices.length >= 2) {
      const names = selectedDevices.map((d) => d.name);
      const title = `Compare ${names.join(" vs ")}`;
      const description = `Side-by-side comparison of ${names.join(", ")} for OpenClaw compatibility. Compare specs, performance, and fork verdicts.`;
        return createFilterAwareMetadata({
          title,
          description,
          basePath: "/compare",
          hasFilters: true,
        });
    }
  }

  return createFilterAwareMetadata({
    title: "Compare Devices",
    description:
      "Compare up to 3 devices side-by-side to find your perfect OpenClaw host. See specs, pricing, and fork compatibility verdicts.",
    basePath: "/compare",
    hasFilters,
  });
}

function formatRam(gb: number): string {
  if (gb < 0.001) return `${Math.round(gb * 1024 * 1024)}KB`;
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

function formatPrice(d: { price_usd: number | null; price_type: string | null }) {
  if (!d.price_usd) return "Free";
  return d.price_type === "monthly" ? `$${d.price_usd}/mo` : `$${d.price_usd}`;
}

function SpecRow({ label, icon: Icon, values }: { label: string; icon: React.ElementType; values: React.ReactNode[] }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-ocean-50 last:border-0">
      <div className="flex items-center gap-2 w-24 shrink-0 pt-0.5">
        <Icon size={14} className="text-ocean-500" />
        <span className="text-xs font-medium text-navy-light">{label}</span>
      </div>
      <div className="flex-1 grid gap-3" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
        {values.map((v, i) => (
          <div key={i} className="text-sm text-navy">{v}</div>
        ))}
      </div>
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ devices?: string }>;
}) {
  const params = await searchParams;
  const allDevices = await getDevicesRankedAllCached();
  const selectedSlugs = params.devices?.split(",").filter(Boolean) ?? [];
  const selectedDevices = selectedSlugs
    .map((slug) => allDevices.find((d) => d.slug === slug))
    .filter(Boolean) as typeof allDevices;

  const verdictsByDevice = await Promise.all(
    selectedDevices.map(async (d) => ({
      device: d,
      verdicts: await getVerdictsByDeviceCached(d.id),
    }))
  );

  const allForkNames = [...new Set(verdictsByDevice.flatMap((v) => v.verdicts.map((vv) => vv.fork_name)))];

  const jsonLd = buildSchemaGraph([
    buildBreadcrumbList([
      { name: "Home", path: "/" },
      { name: "Compare", path: "/compare" },
    ]),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <JsonLd data={jsonLd} />
      <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy mb-1">Compare Devices</h1>
      <p className="text-sm text-navy-light mb-6">Select up to 3 devices to compare side-by-side.</p>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Left column: Device Selector */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <CompareSelector
            devices={allDevices.map((d) => ({
              id: d.id,
              slug: d.slug,
              name: d.name,
              category: d.category,
              ram_gb: d.ram_gb,
              price_usd: d.price_usd,
              price_type: d.price_type,
              best_verdict: d.best_verdict,
            }))}
            selectedSlugs={selectedSlugs}
          />
        </div>

        {/* Right column: Comparison */}
        <div>
          {selectedDevices.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-ocean-200 bg-ocean-50/30 flex flex-col items-center justify-center py-20 text-center">
              <Monitor size={40} className="text-ocean-300 mb-3" />
              <p className="text-lg font-medium text-navy-light">Pick devices to compare</p>
              <p className="text-sm text-ocean-500 mt-1">Search and select up to 3 from the list</p>
            </div>
          ) : selectedDevices.length === 1 ? (
            <div>
              {/* Single device card */}
              <div className="rounded-xl border border-ocean-200 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Link href={`/devices/${selectedDevices[0].slug}`} className="font-heading text-xl font-bold text-navy hover:text-ocean-800">
                      {selectedDevices[0].name}
                    </Link>
                    <p className="text-xs text-navy-light mt-0.5">{selectedDevices[0].category} &middot; {formatRam(selectedDevices[0].ram_gb)} RAM &middot; {formatPrice(selectedDevices[0])}</p>
                  </div>
                  {selectedDevices[0].best_verdict && <VerdictBadge verdict={selectedDevices[0].best_verdict} size="sm" />}
                </div>
                <div className="rounded-lg bg-ocean-50/50 p-4 text-center">
                  <p className="text-sm text-navy-light">Select another device to see the comparison</p>
                  <ArrowRight size={16} className="mx-auto mt-2 text-ocean-400" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Device headers */}
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${selectedDevices.length}, 1fr)` }}>
                {selectedDevices.map((d) => (
                  <div key={d.id} className="rounded-xl border border-ocean-200 bg-white p-4">
                    <Link href={`/devices/${d.slug}`} className="font-heading text-base font-bold text-navy hover:text-ocean-800 block truncate">
                      {d.name}
                    </Link>
                    <p className="text-xs text-navy-light mt-0.5">{d.category}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-lg font-bold text-ocean-800">{formatPrice(d)}</span>
                      {d.best_verdict && <VerdictBadge verdict={d.best_verdict} size="sm" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Specs comparison */}
              <div className="rounded-xl border border-ocean-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-navy mb-3">Specifications</h2>
                <SpecRow label="RAM" icon={MemoryStick} values={selectedDevices.map((d) => <span key={d.id} className="font-semibold">{formatRam(d.ram_gb)}</span>)} />
                <SpecRow label="CPU" icon={Cpu} values={selectedDevices.map((d) => <span key={d.id} className="text-xs">{d.cpu ?? "—"}</span>)} />
                <SpecRow label="GPU" icon={Monitor} values={selectedDevices.map((d) => <span key={d.id} className="text-xs">{d.gpu ?? "—"}</span>)} />
                <SpecRow label="Power" icon={Zap} values={selectedDevices.map((d) => d.power_watts ? `${d.power_watts}W` : "—")} />
                <SpecRow label="Price" icon={DollarSign} values={selectedDevices.map((d) => <span key={d.id} className="font-semibold text-ocean-800">{formatPrice(d)}</span>)} />
              </div>

              {/* Fork verdicts */}
              {allForkNames.length > 0 && (
                <div className="rounded-xl border border-ocean-200 bg-white p-5">
                  <h2 className="text-sm font-semibold text-navy mb-3">Fork Compatibility</h2>
                  {allForkNames.map((forkName) => (
                    <div key={forkName} className="flex items-center gap-3 py-2.5 border-b border-ocean-50 last:border-0">
                      <span className="w-24 shrink-0 text-xs font-medium text-navy-light truncate">{forkName}</span>
                      <div className="flex-1 grid gap-3" style={{ gridTemplateColumns: `repeat(${selectedDevices.length}, 1fr)` }}>
                        {verdictsByDevice.map(({ device, verdicts }) => {
                          const v = verdicts.find((vv) => vv.fork_name === forkName);
                          return (
                            <div key={device.id}>
                              {v ? <VerdictBadge verdict={v.verdict} size="sm" /> : <span className="text-xs text-navy-light">—</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
