"use server";

import { auth } from "@/lib/auth";
import { upsertUser, addComment, submitUserVerdict, voteOnVerdict, getUserByAuthId } from "@/lib/queries";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";

async function getAuthenticatedUser() {
  const { data: session } = await auth.getSession();
  if (!session?.user) throw new Error("Must be signed in");

  const authId = session.user.id;
  const rl = rateLimit(`actions:${authId}`, 30, 60_000);
  if (!rl.success) throw new Error("Too many requests. Please try again later.");

  // Ensure user exists in our local users table
  await upsertUser(
    authId,
    session.user.name ?? session.user.email ?? "User",
    session.user.image ?? null
  );

  const user = await getUserByAuthId(authId);
  if (!user) throw new Error("User not found");

  return user;
}

export async function rateDevice(deviceId: number, forkId: number, stars: number) {
  const user = await getAuthenticatedUser();
  const { upsertRating } = await import("@/lib/queries");
  await upsertRating(deviceId, forkId, user.id, stars);
  revalidatePath(`/devices`);
}

export async function postComment(deviceId: number, forkId: number | null, content: string) {
  if (!content.trim()) throw new Error("Comment cannot be empty");
  if (content.length > 2000) throw new Error("Comment too long");
  const user = await getAuthenticatedUser();
  await addComment(deviceId, forkId, user.id, content.trim());
  revalidatePath(`/devices`);
}

const VALID_VERDICTS = ["RUNS_GREAT", "RUNS_OK", "BARELY_RUNS", "WONT_RUN"] as const;

export async function submitVerdict(
  deviceId: number,
  forkId: number,
  verdict: string,
  notes: string,
  evidenceUrl: string | null
) {
  if (!VALID_VERDICTS.includes(verdict as typeof VALID_VERDICTS[number])) {
    throw new Error("Invalid verdict");
  }
  if (notes && notes.length > 2000) throw new Error("Notes too long");
  if (evidenceUrl && evidenceUrl.length > 500) throw new Error("Evidence URL too long");
  const user = await getAuthenticatedUser();
  await submitUserVerdict(
    user.id,
    deviceId,
    forkId,
    verdict,
    notes.trim() || null,
    evidenceUrl?.trim() || null
  );
  revalidatePath(`/devices`);
}

export async function voteVerdict(verdictId: number, vote: 1 | -1) {
  if (vote !== 1 && vote !== -1) throw new Error("Invalid vote");
  const user = await getAuthenticatedUser();
  await voteOnVerdict(user.id, verdictId, vote);
  revalidatePath(`/devices`);
}

export async function submitFork(name: string, githubUrl: string, description: string, language: string) {
  if (!name.trim() || name.length > 100) throw new Error("Fork name is required (max 100 chars)");
  if (!githubUrl.trim() || !githubUrl.startsWith("https://github.com/")) {
    throw new Error("Valid GitHub URL is required");
  }
  if (description && description.length > 1000) throw new Error("Description too long");
  if (language && language.length > 50) throw new Error("Language too long");

  const user = await getAuthenticatedUser();
  const { db } = await import("@/lib/db");
  const { forkSubmissions } = await import("@/lib/schema");
  await db.insert(forkSubmissions).values({
    user_id: user.id,
    name: name.trim(),
    github_url: githubUrl.trim(),
    description: description.trim() || null,
    language: language.trim() || null,
  });
  revalidatePath("/profile");
}

export async function updateProfile(name: string) {
  if (!name.trim() || name.length > 100) throw new Error("Name is required (max 100 chars)");
  const user = await getAuthenticatedUser();
  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/schema");
  const { eq } = await import("drizzle-orm");
  await db.update(users).set({ username: name.trim() }).where(eq(users.id, user.id));
  revalidatePath("/profile");
}

export async function reviewSubmission(
  submissionId: number,
  decision: "approved" | "rejected",
  reviewerNotes: string | null
) {
  if (decision !== "approved" && decision !== "rejected") {
    throw new Error("Invalid decision");
  }
  const user = await getAuthenticatedUser();
  if (!user.is_admin) throw new Error("Unauthorized");

  const { db } = await import("@/lib/db");
  const { forkSubmissions } = await import("@/lib/schema");
  const { eq } = await import("drizzle-orm");
  await db
    .update(forkSubmissions)
    .set({
      status: decision,
      reviewer_notes: reviewerNotes,
      updated_at: new Date(),
    })
    .where(eq(forkSubmissions.id, submissionId));
  revalidatePath("/admin/submissions");
  revalidatePath("/profile");
}
