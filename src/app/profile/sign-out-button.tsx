"use client";

import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 rounded-lg border border-ocean-200 px-3 py-1.5 text-sm text-ocean-800 hover:bg-ocean-50 transition-colors cursor-pointer"
    >
      <LogOut size={14} />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
