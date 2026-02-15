"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-navy-light hover:bg-ocean-100 transition-colors"
        aria-label="Toggle menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 border-b border-ocean-200 bg-white/95 backdrop-blur-sm shadow-lg z-50">
          <div className="flex flex-col px-4 py-3 gap-1">
            <Link
              href="/devices"
              onClick={() => setOpen(false)}
              className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-navy-light hover:text-ocean-800 hover:bg-ocean-50 transition-colors"
            >
              Devices
            </Link>
            <Link
              href="/forks"
              onClick={() => setOpen(false)}
              className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-navy-light hover:text-ocean-800 hover:bg-ocean-50 transition-colors"
            >
              Forks
            </Link>
            <Link
              href="/compare"
              onClick={() => setOpen(false)}
              className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-navy-light hover:text-ocean-800 hover:bg-ocean-50 transition-colors"
            >
              Compare
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
