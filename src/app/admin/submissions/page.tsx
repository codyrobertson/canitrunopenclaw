import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { SubmissionsList } from "./submissions-list";

async function getSubmissions() {
  return db
    .select({
      id: schema.forkSubmissions.id,
      name: schema.forkSubmissions.name,
      github_url: schema.forkSubmissions.github_url,
      description: schema.forkSubmissions.description,
      language: schema.forkSubmissions.language,
      status: schema.forkSubmissions.status,
      reviewer_notes: schema.forkSubmissions.reviewer_notes,
      created_at: schema.forkSubmissions.created_at,
      user_name: schema.users.username,
      user_avatar: schema.users.avatar_url,
    })
    .from(schema.forkSubmissions)
    .innerJoin(schema.users, eq(schema.users.id, schema.forkSubmissions.user_id))
    .orderBy(desc(schema.forkSubmissions.created_at))
    .limit(100);
}

export default async function AdminSubmissionsPage() {
  const submissions = await getSubmissions();
  return <SubmissionsList submissions={submissions} />;
}
