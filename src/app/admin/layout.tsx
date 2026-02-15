import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Shield,
  BarChart3,
  GitFork,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getUserByAuthId } from "@/lib/queries";
import { createMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createMetadata({
  title: "Admin",
  description: "Admin dashboard for Can it run OpenClaw?",
  canonicalPath: "/admin",
  indexable: false,
});

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/submissions", label: "Submissions", icon: GitFork },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/verify", label: "Verify Forks", icon: ShieldCheck },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const appUser = await getUserByAuthId(session.user.id);
  if (!appUser?.is_admin) {
    redirect("/");
  }

  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-ocean-50 to-sand">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {/* Admin header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ocean-800 text-white">
            <Shield size={18} />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-navy">Admin Dashboard</h1>
            <p className="text-xs text-navy-light">Signed in as {appUser.username}</p>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white ring-1 ring-ocean-100 p-1 shadow-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-navy-light hover:text-navy hover:bg-ocean-50 transition-colors whitespace-nowrap"
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
