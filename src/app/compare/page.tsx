import type { Metadata } from "next";
import { getDevicesRanked, getVerdictsByDevice } from "@/lib/queries";
import { VerdictBadge } from "@/components/verdict-badge";
import Link from "next/link";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ devices?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const selectedSlugs = params.devices?.split(",").filter(Boolean) ?? [];

  if (selectedSlugs.length >= 2) {
    const allDevices = getDevicesRanked();
    const selectedDevices = selectedSlugs
      .map((slug) => allDevices.find((d) => d.slug === slug))
      .filter(Boolean) as typeof allDevices;

    if (selectedDevices.length >= 2) {
      const names = selectedDevices.map((d) => d.name);
      const title = `Compare ${names.join(" vs ")}`;
      const description = `Side-by-side comparison of ${names.join(", ")} for OpenClaw compatibility. Compare specs, performance, and fork verdicts.`;
      return {
        title,
        description,
        openGraph: { title, description },
      };
    }
  }

  return {
    title: "Compare Devices",
    description:
      "Compare up to 3 devices side-by-side to find your perfect OpenClaw host. See specs, pricing, and fork compatibility verdicts.",
    openGraph: {
      title: "Compare Devices",
      description:
        "Compare up to 3 devices side-by-side to find your perfect OpenClaw host.",
    },
  };
}

function formatRam(gb: number): string {
  if (gb < 0.001) return `${Math.round(gb * 1024 * 1024)}KB`;
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ devices?: string }>;
}) {
  const params = await searchParams;
  const allDevices = getDevicesRanked();
  const selectedSlugs = params.devices?.split(",").filter(Boolean) ?? [];
  const selectedDevices = selectedSlugs
    .map((slug) => allDevices.find((d) => d.slug === slug))
    .filter(Boolean) as typeof allDevices;

  const verdictsByDevice = selectedDevices.map((d) => ({
    device: d,
    verdicts: getVerdictsByDevice(d.id),
  }));

  const allForkNames = [...new Set(verdictsByDevice.flatMap((v) => v.verdicts.map((vv) => vv.fork_name)))];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-heading text-3xl font-bold text-navy mb-2">Compare Devices</h1>
      <p className="text-navy-light mb-8">Select up to 3 devices to compare side-by-side.</p>

      {/* Device Selector */}
      <div className="mb-8 flex flex-wrap gap-2">
        {allDevices.map((d) => {
          const isSelected = selectedSlugs.includes(d.slug);
          const newSlugs = isSelected
            ? selectedSlugs.filter((s) => s !== d.slug)
            : [...selectedSlugs, d.slug].slice(0, 3);
          return (
            <Link
              key={d.id}
              href={`/compare?devices=${newSlugs.join(",")}`}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors border ${
                isSelected
                  ? "bg-ocean-800 text-white border-ocean-800"
                  : "bg-white text-navy-light border-ocean-200 hover:border-ocean-400"
              } ${!isSelected && selectedSlugs.length >= 3 ? "opacity-50 pointer-events-none" : ""}`}
            >
              {d.name}
            </Link>
          );
        })}
      </div>

      {/* Comparison Table */}
      {selectedDevices.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-ocean-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ocean-200">
                <th className="p-4 text-left font-medium text-ocean-600 bg-ocean-50 w-40">Spec</th>
                {selectedDevices.map((d) => (
                  <th key={d.id} className="p-4 text-left font-heading font-semibold text-navy bg-ocean-50">
                    <Link href={`/devices/${d.slug}`} className="hover:text-ocean-800">{d.name}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">Category</td>
                {selectedDevices.map((d) => <td key={d.id} className="p-4">{d.category}</td>)}
              </tr>
              <tr className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">CPU</td>
                {selectedDevices.map((d) => <td key={d.id} className="p-4 text-xs">{d.cpu ?? "—"}</td>)}
              </tr>
              <tr className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">RAM</td>
                {selectedDevices.map((d) => <td key={d.id} className="p-4 font-semibold">{formatRam(d.ram_gb)}</td>)}
              </tr>
              <tr className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">GPU</td>
                {selectedDevices.map((d) => <td key={d.id} className="p-4 text-xs">{d.gpu ?? "—"}</td>)}
              </tr>
              <tr className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">Power</td>
                {selectedDevices.map((d) => <td key={d.id} className="p-4">{d.power_watts ? `${d.power_watts}W` : "—"}</td>)}
              </tr>
              <tr className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">Price</td>
                {selectedDevices.map((d) => (
                  <td key={d.id} className="p-4 font-semibold text-ocean-800">
                    {d.price_usd ? (d.price_type === "monthly" ? `$${d.price_usd}/mo` : `$${d.price_usd}`) : "Free"}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-ocean-100">
                <td className="p-4 font-medium text-navy-light">Best Verdict</td>
                {selectedDevices.map((d) => (
                  <td key={d.id} className="p-4">
                    {d.best_verdict ? <VerdictBadge verdict={d.best_verdict} size="sm" /> : "—"}
                  </td>
                ))}
              </tr>
              {allForkNames.map((forkName) => (
                <tr key={forkName} className="border-b border-ocean-100">
                  <td className="p-4 font-medium text-navy-light">{forkName}</td>
                  {verdictsByDevice.map(({ device, verdicts }) => {
                    const v = verdicts.find((vv) => vv.fork_name === forkName);
                    return (
                      <td key={device.id} className="p-4">
                        {v ? <VerdictBadge verdict={v.verdict} size="sm" /> : <span className="text-navy-light">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedDevices.length === 0 && (
        <div className="text-center py-16 text-navy-light">
          <p className="text-lg">Select devices above to compare.</p>
        </div>
      )}
    </main>
  );
}
