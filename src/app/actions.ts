"use server";

import { auth } from "@/lib/auth";
import { upsertRating, addComment } from "@/lib/queries";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function rateDevice(deviceId: number, forkId: number, stars: number) {
  const session = await auth();
  if (!session?.user) throw new Error("Must be signed in");
  const githubId = (session as any).githubId;
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
  const user = db().prepare("SELECT id FROM users WHERE github_id = ?").get(githubId) as { id: number } | undefined;
  if (!user) throw new Error("User not found");
  addComment(deviceId, forkId, user.id, content.trim());
  revalidatePath(`/devices`);
}
