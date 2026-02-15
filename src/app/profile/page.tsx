import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { User, MessageSquare, ThumbsUp, Star, FlaskConical } from "lucide-react";
import { auth } from "@/lib/auth";
import { createMetadata } from "@/lib/seo/metadata";
import { getUserByAuthId } from "@/lib/queries";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq, count, desc } from "drizzle-orm";
import { SignOutButton } from "./sign-out-button";
import { ProfileTabs } from "./profile-tabs";

export const metadata: Metadata = createMetadata({
  title: "Your Profile",
  description: "View your profile, verdicts, and ratings on Can it run OpenClaw?",
  canonicalPath: "/profile",
  indexable: false,
});

async function getProfileData(authId: string) {
  const appUser = await getUserByAuthId(authId);
  if (!appUser) return null;

  const [verdictRows, ratingRows, commentRows, benchmarkRows, submissionRows] = await Promise.all([
    db
      .select({
        id: schema.userVerdicts.id,
        verdict: schema.userVerdicts.verdict,
        notes: schema.userVerdicts.notes,
        created_at: schema.userVerdicts.created_at,
        device_name: schema.devices.name,
        device_slug: schema.devices.slug,
        fork_name: schema.forks.name,
        fork_slug: schema.forks.slug,
      })
      .from(schema.userVerdicts)
      .innerJoin(schema.devices, eq(schema.devices.id, schema.userVerdicts.device_id))
      .innerJoin(schema.forks, eq(schema.forks.id, schema.userVerdicts.fork_id))
      .where(eq(schema.userVerdicts.user_id, appUser.id))
      .orderBy(desc(schema.userVerdicts.created_at))
      .limit(50),
    db
      .select({
        stars: schema.userRatings.stars,
        device_name: schema.devices.name,
        device_slug: schema.devices.slug,
        fork_name: schema.forks.name,
      })
      .from(schema.userRatings)
      .innerJoin(schema.devices, eq(schema.devices.id, schema.userRatings.device_id))
      .innerJoin(schema.forks, eq(schema.forks.id, schema.userRatings.fork_id))
      .where(eq(schema.userRatings.user_id, appUser.id))
      .limit(50),
    db
      .select({ value: count() })
      .from(schema.comments)
      .where(eq(schema.comments.user_id, appUser.id)),
    db
      .select({
        id: schema.benchmarkRuns.id,
        status: schema.benchmarkRuns.status,
        started_at: schema.benchmarkRuns.started_at,
        device_name: schema.devices.name,
        device_slug: schema.devices.slug,
        fork_name: schema.forks.name,
      })
      .from(schema.benchmarkRuns)
      .innerJoin(schema.devices, eq(schema.devices.id, schema.benchmarkRuns.device_id))
      .innerJoin(schema.forks, eq(schema.forks.id, schema.benchmarkRuns.fork_id))
      .where(eq(schema.benchmarkRuns.user_id, appUser.id))
      .orderBy(desc(schema.benchmarkRuns.started_at))
      .limit(50),
    db
      .select()
      .from(schema.forkSubmissions)
      .where(eq(schema.forkSubmissions.user_id, appUser.id))
      .orderBy(desc(schema.forkSubmissions.created_at))
      .limit(20),
  ]);

  return {
    user: appUser,
    verdicts: verdictRows,
    ratings: ratingRows,
    commentCount: commentRows[0]?.value ?? 0,
    benchmarkRuns: benchmarkRows,
    submissions: submissionRows,
  };
}

export default async function ProfilePage() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const profile = await getProfileData(session.user.id);

  const stats = [
    { value: profile?.verdicts.length ?? 0, label: "Verdicts", icon: <ThumbsUp size={14} /> },
    { value: profile?.ratings.length ?? 0, label: "Ratings", icon: <Star size={14} /> },
    { value: profile?.commentCount ?? 0, label: "Comments", icon: <MessageSquare size={14} /> },
    { value: profile?.benchmarkRuns.length ?? 0, label: "Benchmarks", icon: <FlaskConical size={14} /> },
  ];

  return (
    <main className="min-h-[80vh] bg-gradient-to-b from-ocean-50 to-sand">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        {/* Profile header */}
        <div className="rounded-2xl bg-white ring-1 ring-ocean-200 shadow-sm overflow-hidden">
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex items-start gap-4 sm:gap-6">
              {/* Avatar */}
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name ?? "Avatar"}
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl ring-2 ring-ocean-100 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-ocean-100 to-ocean-200 ring-2 ring-ocean-100">
                  <User className="h-8 w-8 sm:h-10 sm:w-10 text-ocean-600" />
                </div>
              )}

              {/* Name & info */}
              <div className="flex-1 min-w-0 pt-0.5">
                <h1 className="font-heading text-xl sm:text-2xl font-bold text-navy truncate">
                  {session.user.name ?? "User"}
                </h1>
                <p className="text-sm text-navy-light truncate mt-0.5">{session.user.email}</p>
                {profile?.user.username && profile.user.username !== (session.user.name ?? "User") && (
                  <p className="text-xs text-ocean-600 mt-1 font-medium">@{profile.user.username}</p>
                )}
              </div>

              {/* Sign out */}
              <div className="shrink-0 hidden sm:block">
                <SignOutButton />
              </div>
            </div>

            {/* Mobile sign out */}
            <div className="mt-4 sm:hidden">
              <SignOutButton />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 border-t border-ocean-100 bg-ocean-50/30">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 py-4 sm:py-5">
                <div className="flex items-center gap-1.5">
                  <span className="text-ocean-500 hidden sm:inline-block">{s.icon}</span>
                  <p className="text-lg sm:text-2xl font-bold text-ocean-800 tabular-nums">{s.value}</p>
                </div>
                <p className="text-[10px] sm:text-xs font-medium text-navy-light uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabbed content */}
        <ProfileTabs
          verdicts={profile?.verdicts ?? []}
          ratings={profile?.ratings ?? []}
          benchmarkRuns={profile?.benchmarkRuns ?? []}
          submissions={profile?.submissions ?? []}
          userName={profile?.user.username ?? session.user.name ?? "User"}
        />
      </div>
    </main>
  );
}
