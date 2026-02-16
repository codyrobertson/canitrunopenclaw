"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { postComment } from "@/app/actions";
import { authClient } from "@/lib/auth-client";
import type { Comment } from "@/lib/queries";

export function CommentSection({
  comments,
  deviceId,
}: {
  comments: Comment[];
  deviceId: number;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const session = authClient.useSession();
  const isSignedIn = Boolean(session.data?.user);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await postComment(deviceId, null, content);
      setContent("");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h3 className="font-heading text-xl font-semibold text-navy mb-4">Comments ({comments.length})</h3>
      {session.isPending ? (
        <div className="mb-6 h-24 rounded-xl bg-ocean-50 animate-pulse" />
      ) : isSignedIn ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share your experience with this device..." rows={3} maxLength={2000} className="w-full rounded-xl border border-ocean-300 bg-white px-4 py-3 text-navy placeholder:text-ocean-400 focus:border-ocean-600 focus:outline-none focus:ring-2 focus:ring-ocean-200 transition-all resize-none" />
          <div className="mt-2 flex justify-end">
            <button type="submit" disabled={submitting || !content.trim()} className="rounded-lg bg-ocean-800 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{submitting ? "Posting..." : "Post Comment"}</button>
          </div>
        </form>
      ) : (
        <p className="mb-6 text-sm text-navy-light bg-ocean-100 rounded-lg p-3">
          <Link href="/auth/sign-in" className="text-ocean-800 font-medium hover:underline">
            Sign in
          </Link>{" "}
          to leave a comment.
        </p>
      )}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-lg border border-ocean-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              {comment.avatar_url && (
                <Image
                  src={comment.avatar_url}
                  alt=""
                  width={24}
                  height={24}
                  sizes="24px"
                  className="h-6 w-6 rounded-full"
                />
              )}
              <span className="text-sm font-medium text-navy">{comment.username}</span>
              <span className="text-xs text-navy-light">{new Date(comment.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-navy-light whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-navy-light text-center py-4">No comments yet. Be the first!</p>}
      </div>
    </div>
  );
}
