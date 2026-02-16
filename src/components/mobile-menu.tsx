"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  X,
  Search,
  Monitor,
  GitFork,
  BarChart3,
  ArrowLeftRight,
  Plus,
  BookOpen,
} from "lucide-react";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Focus search when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/devices?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
    setOpen(false);
  }

  const links = [
    { href: "/devices", label: "Devices", icon: Monitor, desc: "Browse 90+ tested devices" },
    { href: "/forks", label: "Forks", icon: GitFork, desc: "OpenClaw implementations" },
    { href: "/compare", label: "Compare", icon: ArrowLeftRight, desc: "Side-by-side comparison" },
    { href: "/benchmarks", label: "Benchmarks", icon: BarChart3, desc: "ClawBench leaderboard" },
    { href: "/guides/getting-started", label: "Getting Started", icon: BookOpen, desc: "Setup guides & tutorials" },
  ];

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-navy-light hover:bg-ocean-100 transition-colors"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 top-14 bg-navy/30 backdrop-blur-[2px] z-40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`fixed top-14 left-0 right-0 z-50 bg-white border-b border-ocean-200 shadow-xl transition-all duration-200 ease-out ${
          open
            ? "translate-y-0 opacity-100"
            : "-translate-y-2 opacity-0 pointer-events-none"
        }`}
      >
        <div className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
          {/* Search */}
          <div className="px-4 pt-4 pb-3">
            <form onSubmit={handleSearch} className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ocean-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search devices..."
                className="w-full rounded-lg border border-ocean-200 bg-ocean-50/50 py-2.5 pl-9 pr-4 text-sm text-navy placeholder:text-ocean-400 focus:border-ocean-400 focus:outline-none focus:ring-1 focus:ring-ocean-400"
              />
            </form>
          </div>

          {/* Navigation */}
          <div className="px-3 pb-2">
            {links.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-ocean-50 text-ocean-800"
                      : "text-navy hover:bg-ocean-50/60 hover:text-ocean-800"
                  }`}
                >
                  <link.icon size={18} className={isActive ? "text-ocean-600" : "text-ocean-400"} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{link.label}</div>
                    <div className="text-[11px] text-navy-light">{link.desc}</div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Divider + Actions */}
          <div className="border-t border-ocean-100 px-4 py-3">
            <Link
              href="/submit-fork"
              className="flex items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-ocean-300 py-2.5 text-sm font-medium text-ocean-700 hover:bg-ocean-50 hover:border-ocean-400 transition-colors"
            >
              <Plus size={16} />
              Submit a Fork
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
