"use server";

import { auth } from "@/lib/auth";
import { upsertRating, addComment, submitUserVerdict, voteOnVerdict } from "@/lib/queries";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";

function checkActionRateLimit(githubId: string): void {
  const rl = rateLimit(`actions:${githubId}`, 30, 60_000);
  if (!rl.success) {
    throw new Error("Too many requests. Please try again later.");
  }
}

export async function rateDevice(deviceId: number, forkId: number, stars: number) {
  const session = await auth();
  if (!session?.user) throw new Error("Must be signed in");
  const githubId = (session as any).githubId;
  checkActionRateLimit(githubId);
  const user = db().prepare("SELECT id FROM users WHERE github_id = ?").get(githubId) as { id: number } | undefined;
  if (!user) throw new Error("User not found");
  upsertRating(deviceId, forkId, user.id, stars);
  revalidatePath(`/devices`);
}

export async function postComment(deviceId: number, forkId: number | null, content: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Must be signed in");
  if (!content.trim()) throw new Error("Comment cannot be empty");
  if (content.length > 2000) throw new Error("Comment too long");
  const githubId = (session as any).githubId;
  checkActionRateLimit(githubId);
  const user = db().prepare("SELECT id FROM users WHERE github_id = ?").get(githubId) as { id: number } | undefined;
  if (!user) throw new Error("User not found");
  addComment(deviceId, forkId, user.id, content.trim());
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
  const session = await auth();
  if (!session?.user) throw new Error("Must be signed in");
  if (!VALID_VERDICTS.includes(verdict as typeof VALID_VERDICTS[number])) {
    throw new Error("Invalid verdict");
  }
  if (notes && notes.length > 2000) throw new Error("Notes too long");
  if (evidenceUrl && evidenceUrl.length > 500) throw new Error("Evidence URL too long");
  const githubId = (session as any).githubId;
  checkActionRateLimit(githubId);
  const user = db().prepare("SELECT id FROM users WHERE github_id = ?").get(githubId) as { id: number } | undefined;
  if (!user) throw new Error("User not found");
  submitUserVerdict(
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
  const session = await auth();
  if (!session?.user) throw new Error("Must be signed in");
  if (vote !== 1 && vote !== -1) throw new Error("Invalid vote");
  const githubId = (session as any).githubId;
  checkActionRateLimit(githubId);
  const user = db().prepare("SELECT id FROM users WHERE github_id = ?").get(githubId) as { id: number } | undefined;
  if (!user) throw new Error("User not found");
  voteOnVerdict(user.id, verdictId, vote);
  revalidatePath(`/devices`);
}
