import {
  Users,
  ThumbsUp,
  Star,
  MessageSquare,
  GitFork,
  FlaskConical,
  Eye,
} from "lucide-react";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { count, desc, eq } from "drizzle-orm";
import { getViewCount } from "@/lib/queries";
import { withNextCache } from "@/lib/seo/cache";

async function getAdminStatsUncached() {
  const [
    usersCount,
    verdictsCount,
    ratingsCount,
    commentsCount,
    benchmarkCount,
    pendingSubs,
    recentUsers,
    todayViews,
    weekViews,
  ] = await Promise.all([
    db.select({ value: count() }).from(schema.users),
    db.select({ value: count() }).from(schema.userVerdicts),
    db.select({ value: count() }).from(schema.userRatings),
    db.select({ value: count() }).from(schema.comments),
    db.select({ value: count() }).from(schema.benchmarkRuns),
    db
      .select({ value: count() })
      .from(schema.forkSubmissions)
      .where(eq(schema.forkSubmissions.status, "pending")),
    db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        avatar_url: schema.users.avatar_url,
      })
      .from(schema.users)
      .orderBy(desc(schema.users.id))
      .limit(10),
    getViewCount(1),
    getViewCount(7),
  ]);

  return {
    users: usersCount[0]?.value ?? 0,
    verdicts: verdictsCount[0]?.value ?? 0,
    ratings: ratingsCount[0]?.value ?? 0,
    comments: commentsCount[0]?.value ?? 0,
    benchmarks: benchmarkCount[0]?.value ?? 0,
    pendingSubmissions: pendingSubs[0]?.value ?? 0,
    recentUsers,
    todayViews,
    weekViews,
  };
}

async function getAdminStats() {
  return withNextCache({
    keyParts: ["admin", "overview", "stats"],
    options: { revalidate: 60, tags: ["admin:overview"] },
    fn: getAdminStatsUncached,
  });
}

export default async function AdminOverviewPage() {
  const stats = await getAdminStats();

  const cards = [
    { label: "Users", value: stats.users, icon: Users, color: "text-ocean-600" },
    { label: "Verdicts", value: stats.verdicts, icon: ThumbsUp, color: "text-verdict-great" },
    { label: "Ratings", value: stats.ratings, icon: Star, color: "text-amber-500" },
    { label: "Comments", value: stats.comments, icon: MessageSquare, color: "text-ocean-700" },
    { label: "Benchmarks", value: stats.benchmarks, icon: FlaskConical, color: "text-verdict-ok" },
    { label: "Pending Subs", value: stats.pendingSubmissions, icon: GitFork, color: stats.pendingSubmissions > 0 ? "text-verdict-barely" : "text-navy-light" },
    { label: "Views Today", value: stats.todayViews, icon: Eye, color: "text-ocean-600" },
    { label: "Views (7d)", value: stats.weekViews, icon: Eye, color: "text-ocean-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl bg-white border border-ocean-200 shadow-sm p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <c.icon size={16} className={c.color} />
              <span className="text-xs font-medium text-navy-light uppercase tracking-wide">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-navy tabular-nums">{c.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Recent users */}
      <div className="rounded-xl bg-white ring-1 ring-ocean-100 shadow-sm overflow-hidden">
        <div className="border-b border-ocean-100 px-5 py-3.5">
          <h2 className="font-heading text-sm font-semibold text-navy flex items-center gap-2">
            <Users size={15} className="text-ocean-600" />
            Recent Users
          </h2>
        </div>
        <div className="divide-y divide-ocean-50">
          {stats.recentUsers.length === 0 ? (
            <p className="px-5 py-8 text-sm text-navy-light text-center">No users yet.</p>
          ) : (
            stats.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                {u.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full ring-1 ring-ocean-100" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ocean-50 ring-1 ring-ocean-100">
                    <Users size={14} className="text-ocean-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy truncate">{u.username}</p>
                  <p className="text-[11px] text-navy-light">ID #{u.id}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
