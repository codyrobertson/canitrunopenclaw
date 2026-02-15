"use client";

import { useState, useTransition } from "react";
import {
  GitFork,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  Users,
} from "lucide-react";
import { reviewSubmission } from "@/app/actions";

type Submission = {
  id: number;
  name: string;
  github_url: string;
  description: string | null;
  language: string | null;
  status: string;
  reviewer_notes: string | null;
  created_at: Date;
  user_name: string;
  user_avatar: string | null;
};

type Filter = "all" | "pending" | "approved" | "rejected";

const statusConfig: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
  pending: {
    icon: <Clock size={13} />,
    label: "Pending",
    className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
  approved: {
    icon: <CheckCircle2 size={13} />,
    label: "Approved",
    className: "bg-green-50 text-green-700 ring-1 ring-green-200",
  },
  rejected: {
    icon: <XCircle size={13} />,
    label: "Rejected",
    className: "bg-red-50 text-red-700 ring-1 ring-red-200",
  },
};

export function SubmissionsList({ submissions: initial }: { submissions: Submission[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [submissions, setSubmissions] = useState(initial);

  const filtered = filter === "all"
    ? submissions
    : submissions.filter((s) => s.status === filter);

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-5">
      {/* Header + filter */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-navy flex items-center gap-2">
          <GitFork size={18} className="text-ocean-600" />
          Fork Submissions
          {pendingCount > 0 && (
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {pendingCount} pending
            </span>
          )}
        </h2>
        <div className="flex gap-1 rounded-lg bg-white ring-1 ring-ocean-100 p-0.5">
          {(["all", "pending", "approved", "rejected"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors cursor-pointer ${
                filter === f
                  ? "bg-ocean-800 text-white"
                  : "text-navy-light hover:text-navy hover:bg-ocean-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white ring-1 ring-ocean-100 py-14 text-center">
          <GitFork size={32} className="mx-auto text-ocean-300" />
          <p className="mt-3 text-sm text-navy-light">
            No {filter === "all" ? "" : filter} submissions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <SubmissionCard
              key={s.id}
              submission={s}
              onUpdate={(updated) => {
                setSubmissions((prev) =>
                  prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x))
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionCard({
  submission: s,
  onUpdate,
}: {
  submission: Submission;
  onUpdate: (updated: { id: number; status: string; reviewer_notes: string | null }) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const config = statusConfig[s.status] ?? statusConfig.pending;

  function handleReview(decision: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      try {
        await reviewSubmission(s.id, decision, notes.trim() || null);
        onUpdate({ id: s.id, status: decision, reviewer_notes: notes.trim() || null });
        setShowNotes(false);
        setNotes("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="rounded-xl bg-white ring-1 ring-ocean-100 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {/* User avatar */}
          {s.user_avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.user_avatar} alt="" className="h-8 w-8 rounded-full ring-1 ring-ocean-100 shrink-0 mt-0.5" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ocean-50 ring-1 ring-ocean-100 shrink-0 mt-0.5">
              <Users size={14} className="text-ocean-400" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Name + status */}
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={s.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-navy hover:text-ocean-700 transition-colors flex items-center gap-1"
              >
                {s.name}
                <ExternalLink size={12} className="text-ocean-400" />
              </a>
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${config.className}`}>
                {config.icon}
                {config.label}
              </span>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-1 text-xs text-navy-light">
              <span>by {s.user_name}</span>
              {s.language && <span>{s.language}</span>}
              <span>{new Date(s.created_at).toLocaleDateString()}</span>
            </div>

            {/* Description */}
            {s.description && (
              <p className="mt-2 text-sm text-navy-light leading-relaxed">{s.description}</p>
            )}

            {/* Existing reviewer notes */}
            {s.reviewer_notes && (
              <div className="mt-2 rounded-lg bg-ocean-50 px-3 py-2 text-xs text-navy-light">
                <span className="font-semibold">Reviewer:</span> {s.reviewer_notes}
              </div>
            )}
          </div>
        </div>

        {/* Actions for pending */}
        {s.status === "pending" && (
          <div className="mt-4 pt-3 border-t border-ocean-100">
            {error && (
              <p className="text-xs text-red-600 mb-2">{error}</p>
            )}

            {showNotes ? (
              <div className="space-y-3">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional reviewer notes..."
                  rows={2}
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm text-navy ring-1 ring-gray-300 focus:ring-2 focus:ring-ocean-500 outline-none transition-shadow resize-none placeholder:text-gray-400"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReview("approved")}
                    disabled={isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview("rejected")}
                    disabled={isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    Reject
                  </button>
                  <button
                    onClick={() => { setShowNotes(false); setNotes(""); }}
                    className="text-sm text-navy-light hover:text-navy transition-colors cursor-pointer px-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNotes(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-ocean-800 px-3.5 py-2 text-sm font-medium text-white hover:bg-ocean-700 transition-colors cursor-pointer"
                >
                  Review
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
