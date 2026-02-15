"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function SearchBar({ placeholder = "Search devices..." }: { placeholder?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    router.push(`/devices?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/20 bg-white/95 px-4 py-3.5 pl-11 text-navy shadow-lg placeholder:text-navy-light/50 focus:border-ocean-400 focus:outline-none focus:ring-2 focus:ring-ocean-300/50 focus:bg-white transition-all backdrop-blur-sm"
      />
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ocean-400" />
    </form>
  );
}
