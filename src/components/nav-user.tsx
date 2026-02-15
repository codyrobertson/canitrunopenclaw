"use client";

import Link from "next/link";
import Image from "next/image";
import { LogOut, Shield } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function NavUser({
  name,
  image,
  isAdmin,
}: {
  name: string;
  image: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {isAdmin && (
        <Link
          href="/admin"
          className="flex items-center gap-1 text-xs font-medium text-ocean-600 hover:text-ocean-800 transition-colors"
          title="Admin Dashboard"
        >
          <Shield size={14} />
          <span className="hidden sm:inline">Admin</span>
        </Link>
      )}
      <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        {image && (
          <Image
            src={image}
            alt={name}
            width={32}
            height={32}
            sizes="(min-width: 640px) 32px, 28px"
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-ocean-200"
          />
        )}
        <span className="hidden sm:inline text-sm text-navy-light">{name}</span>
      </Link>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-1 text-sm text-ocean-800 hover:text-ocean-600 transition-colors cursor-pointer"
      >
        <LogOut size={14} />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
