"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

export function FilterToggle({
  children,
  hasActiveFilters,
}: {
  children: React.ReactNode;
  hasActiveFilters: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-ocean-200 bg-white px-4 py-2.5 text-sm font-medium text-navy hover:bg-ocean-50 transition-colors w-full sm:w-auto"
      >
        <SlidersHorizontal size={16} className="text-ocean-600" />
        <span>Filters</span>
        {hasActiveFilters && (
          <span className="flex h-2 w-2 rounded-full bg-ocean-600" />
        )}
        {open ? <X size={14} className="ml-auto text-navy-light" /> : null}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-ocean-200 bg-white p-5">
          {children}
        </div>
      )}
    </div>
  );
}
