import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";
import { Github, LogOut, Menu } from "lucide-react";
import { MobileMenu } from "./mobile-menu";

export async function Nav() {
  const session = await auth();

  return (
    <nav className="border-b border-ocean-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl">&#x1F980;</span>
              <span className="font-heading text-base sm:text-lg font-bold text-ocean-800">
                Can it run OpenClaw?
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/devices" className="text-sm font-medium text-navy-light hover:text-ocean-800 transition-colors">
                Devices
              </Link>
              <Link href="/forks" className="text-sm font-medium text-navy-light hover:text-ocean-800 transition-colors">
                Forks
              </Link>
              <Link href="/compare" className="text-sm font-medium text-navy-light hover:text-ocean-800 transition-colors">
                Compare
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session?.user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <img
                  src={session.user.image ?? ""}
                  alt={session.user.name ?? ""}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-ocean-200"
                />
                <span className="hidden sm:inline text-sm text-navy-light">{session.user.name}</span>
                <form action={async () => {
                  "use server";
                  await signOut();
                }}>
                  <button className="flex items-center gap-1 text-sm text-ocean-800 hover:text-ocean-600 transition-colors">
                    <LogOut size={14} />
                    <span className="hidden sm:inline">Sign out</span>
                  </button>
                </form>
              </div>
            ) : (
              <form action={async () => {
                "use server";
                await signIn("github");
              }}>
                <button className="flex items-center gap-2 rounded-lg bg-ocean-800 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-ocean-700 transition-colors">
                  <Github size={16} />
                  <span className="hidden sm:inline">Sign in with GitHub</span>
                  <span className="sm:hidden">Sign in</span>
                </button>
              </form>
            )}
            <MobileMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
