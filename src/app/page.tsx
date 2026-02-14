import Link from "next/link";
import { getDevicesRanked, getAllForks } from "@/lib/queries";
import { DeviceCard } from "@/components/device-card";
import { SearchBar } from "@/components/search-bar";

export default function Home() {
  const topDevices = getDevicesRanked().slice(0, 6);
  const forks = getAllForks();

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-ocean-200 via-ocean-100 to-sand py-20">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 1200 600" fill="none">
            <path d="M0 300 Q300 200 600 300 Q900 400 1200 300 V600 H0Z" fill="currentColor" className="text-ocean-600" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-heading text-5xl font-bold text-navy sm:text-6xl">
            Can it run{" "}
            <span className="text-ocean-800">OpenClaw</span>
            <span className="text-ocean-600">?</span>
          </h1>
          <p className="mt-4 text-xl text-navy-light">
            Find out if your hardware can handle the claw. Browse {topDevices.length}+ devices
            across {forks.length} OpenClaw forks.
          </p>
          <div className="mt-8 flex justify-center">
            <SearchBar placeholder="Search devices by name, CPU, or description..." />
          </div>
        </div>
      </section>

      {/* Top Rated Devices */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-heading text-2xl font-bold text-navy">
            Top Rated Devices
          </h2>
          <Link href="/devices" className="text-sm font-medium text-ocean-800 hover:text-ocean-600 transition-colors">
            View all &rarr;
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topDevices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      </section>

      {/* Fork Overview */}
      <section className="bg-white border-y border-ocean-200">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="font-heading text-2xl font-bold text-navy mb-8">
            OpenClaw Forks
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {forks.map((fork) => {
              const features = JSON.parse(fork.features) as string[];
              return (
                <Link
                  key={fork.id}
                  href={`/forks/${fork.slug}`}
                  className="group rounded-xl border border-ocean-200 p-5 hover:border-ocean-400 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono font-medium text-ocean-600 bg-ocean-100 px-2 py-0.5 rounded">
                      {fork.language}
                    </span>
                    <span className="text-xs text-navy-light">
                      {fork.min_ram_mb < 1024 ? `${fork.min_ram_mb}MB` : `${(fork.min_ram_mb / 1024).toFixed(0)}GB`} min
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-navy group-hover:text-ocean-800 transition-colors">
                    {fork.name}
                  </h3>
                  <p className="mt-1 text-sm text-navy-light line-clamp-2">
                    {fork.description}
                  </p>
                  {fork.codebase_size_lines && (
                    <p className="mt-2 text-xs text-ocean-600">
                      {fork.codebase_size_lines.toLocaleString()} lines of code
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ocean-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-navy-light">
          <p>&#x1F980; Can it run OpenClaw? -- An open hardware compatibility directory.</p>
          <p className="mt-1">
            Not affiliated with{" "}
            <a href="https://github.com/openclaw/openclaw" className="text-ocean-800 hover:underline" target="_blank" rel="noopener">
              OpenClaw
            </a>.
            Data sourced from community benchmarks and official documentation.
          </p>
        </div>
      </footer>
    </main>
  );
}
