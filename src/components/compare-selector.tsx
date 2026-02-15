"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Plus, Monitor, Server, Laptop, Cloud, Cpu } from "lucide-react";

type Device = {
  id: number;
  slug: string;
  name: string;
  category: string;
  ram_gb: number;
  price_usd: number | null;
  price_type: string | null;
  best_verdict: string | null;
};

const CATEGORY_META: Record<string, { label: string; icon: typeof Monitor }> = {
  SBC: { label: "SBCs", icon: Cpu },
  Desktop: { label: "Desktops", icon: Monitor },
  Laptop: { label: "Laptops", icon: Laptop },
  Cloud: { label: "Cloud", icon: Cloud },
  Microcontroller: { label: "Micro", icon: Cpu },
  NAS: { label: "NAS", icon: Server },
  Mobile: { label: "Mobile", icon: Monitor },
  "Gaming Handheld": { label: "Gaming", icon: Monitor },
};

function formatRam(gb: number): string {
  if (gb < 0.001) return `${Math.round(gb * 1024 * 1024)}KB`;
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

export function CompareSelector({
  devices,
  selectedSlugs,
}: {
  devices: Device[];
  selectedSlugs: string[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(devices.map((d) => d.category))].sort(),
    [devices]
  );

  const filtered = useMemo(() => {
    let result = devices;
    if (activeCategory) {
      result = result.filter((d) => d.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [devices, search, activeCategory]);

  const selectedDevices = selectedSlugs
    .map((slug) => devices.find((d) => d.slug === slug))
    .filter(Boolean) as Device[];

  function toggleDevice(slug: string) {
    const isSelected = selectedSlugs.includes(slug);
    const newSlugs = isSelected
      ? selectedSlugs.filter((s) => s !== slug)
      : [...selectedSlugs, slug].slice(0, 3);
    router.push(`/compare?devices=${newSlugs.join(",")}`);
  }

  function removeDevice(slug: string) {
    const newSlugs = selectedSlugs.filter((s) => s !== slug);
    router.push(
      newSlugs.length ? `/compare?devices=${newSlugs.join(",")}` : "/compare"
    );
  }

  return (
    <div>
      {/* Selected devices pills */}
      {selectedDevices.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedDevices.map((d, i) => (
            <div
              key={d.slug}
              className="flex items-center gap-2 rounded-full bg-ocean-800 text-white pl-4 pr-2 py-1.5 text-sm font-medium"
            >
              <span className="text-ocean-300 text-xs mr-1">{i + 1}</span>
              {d.name}
              <button
                onClick={() => removeDevice(d.slug)}
                className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-ocean-700 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {selectedSlugs.length < 3 && (
            <div className="flex items-center gap-1 rounded-full border-2 border-dashed border-ocean-300 text-ocean-500 px-4 py-1.5 text-sm">
              <Plus size={14} />
              Add device ({3 - selectedSlugs.length} remaining)
            </div>
          )}
        </div>
      )}

      {/* Search and filter */}
      <div className="rounded-xl border border-ocean-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-ocean-100">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ocean-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search devices by name..."
              className="w-full rounded-lg border border-ocean-200 bg-ocean-50/50 py-2.5 pl-10 pr-4 text-sm text-navy placeholder:text-ocean-400 focus:border-ocean-400 focus:outline-none focus:ring-1 focus:ring-ocean-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ocean-400 hover:text-navy"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <button
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === null
                  ? "bg-ocean-800 text-white"
                  : "bg-ocean-50 text-navy-light hover:bg-ocean-100"
              }`}
            >
              All ({devices.length})
            </button>
            {categories.map((cat) => {
              const count = devices.filter((d) => d.category === cat).length;
              const meta = CATEGORY_META[cat];
              return (
                <button
                  key={cat}
                  onClick={() =>
                    setActiveCategory(activeCategory === cat ? null : cat)
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-ocean-800 text-white"
                      : "bg-ocean-50 text-navy-light hover:bg-ocean-100"
                  }`}
                >
                  {meta?.label ?? cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Device list */}
        <div className="max-h-72 overflow-y-auto divide-y divide-ocean-50">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-navy-light">
              No devices match your search.
            </div>
          ) : (
            filtered.map((d) => {
              const isSelected = selectedSlugs.includes(d.slug);
              const isDisabled = !isSelected && selectedSlugs.length >= 3;
              return (
                <button
                  key={d.id}
                  onClick={() => !isDisabled && toggleDevice(d.slug)}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? "bg-ocean-50"
                      : isDisabled
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-ocean-50/50"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-5 h-5 rounded border-2 shrink-0 ${
                      isSelected
                        ? "bg-ocean-800 border-ocean-800 text-white"
                        : "border-ocean-300"
                    }`}
                  >
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 3.5L3.5 6L9 1"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-navy truncate">
                      {d.name}
                    </div>
                    <div className="text-xs text-navy-light">
                      {d.category} &middot; {formatRam(d.ram_gb)} RAM
                      {d.price_usd
                        ? ` · ${d.price_type === "monthly" ? `$${d.price_usd}/mo` : `$${d.price_usd}`}`
                        : ""}
                    </div>
                  </div>
                  {d.best_verdict && (
                    <span
                      className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        d.best_verdict === "RUNS_GREAT"
                          ? "bg-verdict-great/10 text-verdict-great"
                          : d.best_verdict === "RUNS_OK"
                            ? "bg-verdict-ok/10 text-verdict-ok"
                            : d.best_verdict === "BARELY_RUNS"
                              ? "bg-verdict-barely/10 text-verdict-barely"
                              : "bg-verdict-wont/10 text-verdict-wont"
                      }`}
                    >
                      {d.best_verdict.replace(/_/g, " ")}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
