"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { NavUser } from "./nav-user";

type MeResponse = { isAdmin: boolean };

export function NavAuthSlot() {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkedAdmin, setCheckedAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setIsAdmin(false);
      setCheckedAdmin(false);
      return;
    }
    if (checkedAdmin) return;

    (async () => {
      try {
        const res = await fetch("/api/me", { method: "GET" });
        if (!res.ok) return;
        const data = (await res.json()) as MeResponse;
        if (!cancelled) setIsAdmin(Boolean(data.isAdmin));
      } catch {
        // Ignore.
      } finally {
        if (!cancelled) setCheckedAdmin(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, checkedAdmin]);

  if (session.isPending) {
    return (
      <div className="hidden sm:flex items-center gap-2">
        <div className="h-9 w-24 rounded-lg bg-ocean-100 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/auth/sign-in"
        className="flex items-center gap-2 rounded-lg bg-ocean-800 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-ocean-700 transition-colors"
      >
        <LogIn size={16} />
        <span>Sign in</span>
      </Link>
    );
  }

  return (
    <NavUser
      name={user.name ?? user.email ?? "User"}
      image={user.image ?? null}
      isAdmin={isAdmin}
    />
  );
}

