import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserByAuthId } from "@/lib/queries";
import { LogIn } from "lucide-react";
import { MobileMenu } from "./mobile-menu";
import { NavUser } from "./nav-user";

export async function Nav() {
  const { data: session } = await auth.getSession();
  const appUser = session?.user ? await getUserByAuthId(session.user.id) : null;

  return (
    <nav className="border-b border-ocean-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center">
          {/* Logo — fixed width so center section is truly centered */}
          <div className="flex items-center shrink-0">
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/canitrunopenclawlogo.svg"
                alt="Can it run OpenClaw?"
                className="h-7 w-auto sm:h-8"
              />
              <span className="font-heading text-base sm:text-lg font-bold text-ocean-800">
                Can it run OpenClaw?
              </span>
            </Link>
          </div>

          {/* Nav links — centered */}
          <div className="hidden md:flex items-center justify-center gap-6 flex-1">
            <Link href="/devices" className="text-sm font-medium text-navy-light hover:text-ocean-800 transition-colors">
              Devices
            </Link>
            <Link href="/forks" className="text-sm font-medium text-navy-light hover:text-ocean-800 transition-colors">
              Forks
            </Link>
            <Link href="/compare" className="text-sm font-medium text-navy-light hover:text-ocean-800 transition-colors">
              Compare
            </Link>
            <Link href="/benchmarks" className="text-sm font-medium text-navy-light hover:text-ocean-800 transition-colors">
              Benchmarks
            </Link>
          </div>

          {/* Right side — auth + mobile menu */}
          <div className="flex items-center gap-2 shrink-0">
            {session?.user ? (
              <NavUser
                name={session.user.name ?? session.user.email ?? "User"}
                image={session.user.image ?? null}
                isAdmin={appUser?.is_admin ?? false}
              />
            ) : (
              <Link
                href="/auth/sign-in"
                className="flex items-center gap-2 rounded-lg bg-ocean-800 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-ocean-700 transition-colors"
              >
                <LogIn size={16} />
                <span>Sign in</span>
              </Link>
            )}
            <MobileMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
