import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";

export async function Nav() {
  const session = await auth();

  return (
    <nav className="border-b border-ocean-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">&#x1F980;</span>
              <span className="font-heading text-lg font-bold text-ocean-800">
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
          <div>
            {session?.user ? (
              <div className="flex items-center gap-3">
                <img
                  src={session.user.image ?? ""}
                  alt={session.user.name ?? ""}
                  className="h-8 w-8 rounded-full border border-ocean-200"
                />
                <span className="text-sm text-navy-light">{session.user.name}</span>
                <form action={async () => {
                  "use server";
                  await signOut();
                }}>
                  <button className="text-sm text-ocean-800 hover:text-ocean-600 transition-colors">
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <form action={async () => {
                "use server";
                await signIn("github");
              }}>
                <button className="rounded-lg bg-ocean-800 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-700 transition-colors">
                  Sign in with GitHub
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
