import Link from "next/link";
import { Github, Rss } from "lucide-react";
import { getAllForksCached, getBestChunkCached, getCategoriesCached } from "@/lib/queries-cached";
import { bestPath } from "@/lib/seo/routes";

const popularDevices = [
  { slug: "raspberry-pi-5-8gb", name: "Raspberry Pi 5" },
  { slug: "raspberry-pi-4-4gb", name: "Raspberry Pi 4" },
  { slug: "mac-mini-m4-pro-24gb", name: "Mac Mini M4 Pro" },
  { slug: "macbook-air-m2", name: "MacBook Air M2" },
  { slug: "orange-pi-5", name: "Orange Pi 5" },
  { slug: "nvidia-jetson-orin-nano", name: "Jetson Orin Nano" },
  { slug: "steam-deck", name: "Steam Deck" },
  { slug: "intel-nuc-13-pro", name: "Intel NUC 13" },
  { slug: "thinkpad-t480", name: "ThinkPad T480" },
  { slug: "dell-optiplex-7050-refurb", name: "Dell OptiPlex 7050" },
  { slug: "raspberry-pi-pico-w", name: "Raspberry Pi Pico W" },
  { slug: "iphone-15-pro", name: "iPhone 15 Pro" },
];

export async function Footer() {
  const forks = await getAllForksCached();
  const categories = await getCategoriesCached();
  const guideCombos = await getBestChunkCached(0, 24);
  const forkNameBySlug = new Map(forks.map((f) => [f.slug, f.name]));

  return (
    <footer className="border-t border-ocean-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Main footer grid */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/canitrunopenclawlogo.svg"
                alt="Can it run OpenClaw?"
                className="h-7 w-auto"
              />
              <span className="font-heading font-bold text-navy">
                Can it run OpenClaw?
              </span>
            </Link>
            <p className="mt-3 text-xs text-navy-light leading-relaxed max-w-xs">
              The open hardware compatibility directory for OpenClaw AI agent
              forks. Community-tested benchmarks and verdicts for 80+ devices.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://github.com/codyrobertson/canitrunopenclaw"
                className="text-navy-light hover:text-ocean-800 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <Github size={18} />
              </a>
              <a
                href="/feed.xml"
                className="text-navy-light hover:text-ocean-800 transition-colors"
                aria-label="RSS Feed"
              >
                <Rss size={18} />
              </a>
            </div>
          </div>

          {/* Browse by Category */}
          <div>
            <h3 className="text-xs font-semibold text-navy uppercase tracking-wider mb-3">
              By Category
            </h3>
            <ul className="space-y-1.5">
              {categories.map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/devices?category=${cat}`}
                    className="text-xs text-navy-light hover:text-ocean-800 transition-colors"
                  >
                    {cat} Devices
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* OpenClaw Forks */}
          <div>
            <h3 className="text-xs font-semibold text-navy uppercase tracking-wider mb-3">
              OpenClaw Forks
            </h3>
            <ul className="space-y-1.5">
              {forks.map((fork) => (
                <li key={fork.slug}>
                  <Link
                    href={`/forks/${fork.slug}`}
                    className="text-xs text-navy-light hover:text-ocean-800 transition-colors"
                  >
                    {fork.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/forks"
                  className="text-xs text-ocean-600 hover:text-ocean-800 transition-colors font-medium"
                >
                  All forks &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Popular Devices */}
          <div>
            <h3 className="text-xs font-semibold text-navy uppercase tracking-wider mb-3">
              Popular Devices
            </h3>
            <ul className="space-y-1.5">
              {popularDevices.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={`/devices/${d.slug}`}
                    className="text-xs text-navy-light hover:text-ocean-800 transition-colors"
                  >
                    {d.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xs font-semibold text-navy uppercase tracking-wider mb-3">
              Resources
            </h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/benchmarks"
                  className="text-xs text-navy-light hover:text-ocean-800 transition-colors"
                >
                  ClawBench Benchmarks
                </Link>
              </li>
              <li>
                <Link
                  href="/compare"
                  className="text-xs text-navy-light hover:text-ocean-800 transition-colors"
                >
                  Compare Devices
                </Link>
              </li>
              <li>
                <Link
                  href="/devices"
                  className="text-xs text-navy-light hover:text-ocean-800 transition-colors"
                >
                  All Devices
                </Link>
              </li>
              <li>
                <Link
                  href={bestPath("SBC", "openclaw")}
                  className="text-xs text-navy-light hover:text-ocean-800 transition-colors"
                >
                  Best SBCs for OpenClaw
                </Link>
              </li>
              <li>
                <Link
                  href="/devices?maxPrice=100"
                  className="text-xs text-navy-light hover:text-ocean-800 transition-colors"
                >
                  Best Budget Devices
                </Link>
              </li>
              <li>
                <Link
                  href={bestPath("Mini PC", "openclaw")}
                  className="text-xs text-navy-light hover:text-ocean-800 transition-colors"
                >
                  Best Mini PCs
                </Link>
              </li>
              <li>
                <Link
                  href="/guides/getting-started"
                  className="text-xs text-navy-light hover:text-ocean-800 transition-colors"
                >
                  Getting Started Guide
                </Link>
              </li>
              <li>
                <Link
                  href="/feed.xml"
                  className="text-xs text-navy-light hover:text-ocean-800 transition-colors"
                >
                  RSS Feed
                </Link>
              </li>
            </ul>
          </div>
        </div>

	        {/* pSEO: "Can [Fork] run on [Category]?" links */}
	        <div className="mt-10 border-t border-ocean-100 pt-6">
	          <h3 className="text-xs font-semibold text-navy uppercase tracking-wider mb-3">
	            Compatibility Guides
	          </h3>
	          <div className="flex flex-wrap gap-x-4 gap-y-1">
	            {guideCombos.map((combo) => {
	              const forkName = forkNameBySlug.get(combo.fork_slug);
	              if (!forkName) return null;
	              return (
	                <Link
	                  key={`${combo.fork_slug}-${combo.category}`}
	                  href={bestPath(combo.category, combo.fork_slug)}
	                  className="text-[11px] text-navy-light hover:text-ocean-600 transition-colors"
	                >
	                  {forkName} on {combo.category}
	                </Link>
	              );
	            })}
	          </div>
	        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-ocean-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-navy-light">
          <p>
            An open hardware compatibility directory for OpenClaw AI agent forks.
            Not affiliated with OpenClaw.
          </p>
          <p>Data sourced from ClawBench and community benchmarks.</p>
        </div>
      </div>
    </footer>
  );
}
