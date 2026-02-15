import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight, Compass, Cpu, GitFork, Trophy } from "lucide-react";

import { createMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbList, buildSchemaGraph, buildTechArticle } from "@/lib/seo/schema";
import { JsonLd } from "@/components/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  return createMetadata({
    title: "Getting Started: Find Hardware That Runs OpenClaw",
    description:
      "Learn how to use Can it run OpenClaw? to pick hardware, compare forks, and follow setup guides based on real compatibility verdicts and benchmarks.",
    canonicalPath: "/guides/getting-started",
  });
}

export default function GettingStartedGuidePage() {
  const jsonLd = buildSchemaGraph([
    buildTechArticle({
      headline: "Getting Started: Find Hardware That Runs OpenClaw",
      description:
        "How to use Can it run OpenClaw? to pick hardware, compare forks, and follow setup guides.",
      about: [
        { "@type": "SoftwareApplication", name: "OpenClaw" },
        { "@type": "Product", name: "Computer Hardware" },
      ],
    }),
    buildBreadcrumbList([
      { name: "Home", path: "/" },
      { name: "Getting Started", path: "/guides/getting-started" },
    ]),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <JsonLd data={jsonLd} />

      <nav className="flex items-center gap-1 text-sm text-navy-light mb-6">
        <Link href="/" className="hover:text-ocean-800">Home</Link>
        <ChevronRight size={14} />
        <span className="text-navy">Getting Started</span>
      </nav>

      <header className="rounded-xl border border-ocean-200 bg-white p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={20} className="text-ocean-600" />
          <span className="text-xs text-navy-light font-medium uppercase tracking-wider">
            Guide
          </span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy">
          Getting Started
        </h1>
        <p className="mt-2 text-sm sm:text-base text-navy-light">
          Use this site to pick hardware that can run OpenClaw and its forks, backed by real compatibility verdicts and ClawBench benchmarks.
        </p>
      </header>

      <section className="rounded-xl border border-ocean-200 bg-white p-6 sm:p-8">
        <h2 className="font-heading text-lg font-semibold text-navy mb-4 flex items-center gap-2">
          <Compass size={18} className="text-ocean-600" />
          The Fast Path
        </h2>

        <ol className="space-y-4 text-sm text-navy-light">
          <li>
            <span className="font-medium text-navy">1. Pick a device.</span>{" "}
            Browse devices by category, RAM, and price, then open the device page to see compatible forks and benchmarks.
            <div className="mt-2">
              <Link href="/devices" className="inline-flex items-center gap-2 rounded-lg bg-ocean-800 px-3 py-2 text-xs font-medium text-white hover:bg-ocean-700 transition-colors">
                <Cpu size={14} /> Browse devices
              </Link>
            </div>
          </li>

          <li>
            <span className="font-medium text-navy">2. Pick a fork.</span>{" "}
            Fork pages summarize minimum requirements, maturity, and which devices have been tested.
            <div className="mt-2">
              <Link href="/forks" className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-ocean-800 border border-ocean-200 hover:bg-ocean-50 transition-colors">
                <GitFork size={14} /> Browse forks
              </Link>
            </div>
          </li>

          <li>
            <span className="font-medium text-navy">3. Use a compatibility page for a specific answer.</span>{" "}
            Pages like{" "}
            <span className="font-mono text-navy">/can/[fork]/run-on/[device]</span>{" "}
            give a verdict, notes, and performance signals.
          </li>

          <li>
            <span className="font-medium text-navy">4. Compare performance with ClawBench.</span>{" "}
            Benchmark leaderboards help you choose between devices and forks when multiple options work.
            <div className="mt-2">
              <Link href="/benchmarks" className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-ocean-800 border border-ocean-200 hover:bg-ocean-50 transition-colors">
                <Trophy size={14} /> View benchmarks
              </Link>
            </div>
          </li>
        </ol>
      </section>
    </main>
  );
}

