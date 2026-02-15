"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, ShieldCheck, Upload, MessageSquare } from "lucide-react";
import { submitVerdict, voteVerdict } from "@/app/actions";
import { VerdictBadge } from "@/components/verdict-badge";
import type { UserVerdict, Fork } from "@/lib/queries";

type VerdictOption = "RUNS_GREAT" | "RUNS_OK" | "BARELY_RUNS" | "WONT_RUN";

const VERDICT_OPTIONS: { value: VerdictOption; label: string }[] = [
  { value: "RUNS_GREAT", label: "Runs Great" },
  { value: "RUNS_OK", label: "Runs OK" },
  { value: "BARELY_RUNS", label: "Barely Runs" },
  { value: "WONT_RUN", label: "Won't Run" },
];

export function UserVerdictSection({
  deviceId,
  forks,
  verdicts,
  userVotes,
  isSignedIn,
}: {
  deviceId: number;
  forks: Fork[];
  verdicts: UserVerdict[];
  userVotes: Record<number, number>;
  isSignedIn: boolean;
}) {
  return (
    <div>
      <div className="mb-1">
        <h2 className="font-heading text-lg font-semibold text-navy">Community Reports</h2>
        <p className="text-sm text-navy-light mt-1">
          Real experiences from users who tested these forks.
        </p>
      </div>

      {isSignedIn ? (
        <VerdictForm deviceId={deviceId} forks={forks} />
      ) : (
        <p className="mb-6 text-sm text-navy-light bg-ocean-100 rounded-lg p-3">
          Sign in with GitHub to submit your compatibility report.
        </p>
      )}

      <VerdictList verdicts={verdicts} userVotes={userVotes} isSignedIn={isSignedIn} />
    </div>
  );
}

function VerdictForm({ deviceId, forks }: { deviceId: number; forks: Fork[] }) {
  const [selectedFork, setSelectedFork] = useState("");
  const [verdict, setVerdict] = useState<VerdictOption | "">("");
  const [notes, setNotes] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFork || !verdict) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await submitVerdict(
        deviceId,
        Number(selectedFork),
        verdict,
        notes,
        evidenceUrl.trim() || null
      );
      setSuccess(true);
      setNotes("");
      setEvidenceUrl("");
      setVerdict("");
      setSelectedFork("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit verdict");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-ocean-200 bg-ocean-50/50 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-navy">Submit Your Report</h3>

      {/* Fork selector */}
      <div>
        <label htmlFor="fork-select" className="block text-sm font-medium text-navy-light mb-1">
          Which fork did you test?
        </label>
        <select
          id="fork-select"
          value={selectedFork}
          onChange={(e) => setSelectedFork(e.target.value)}
          className="w-full rounded-lg border border-ocean-300 bg-white px-3 py-2 text-sm text-navy focus:border-ocean-600 focus:outline-none focus:ring-2 focus:ring-ocean-200 transition-all"
          required
        >
          <option value="">Select a fork...</option>
          {forks.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {/* Verdict radio buttons */}
      <div>
        <span className="block text-sm font-medium text-navy-light mb-2">
          How did it run?
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {VERDICT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium cursor-pointer transition-all ${
                verdict === opt.value
                  ? "border-ocean-600 bg-ocean-100 text-ocean-800 ring-2 ring-ocean-200"
                  : "border-ocean-200 bg-white text-navy-light hover:border-ocean-300"
              }`}
            >
              <input
                type="radio"
                name="verdict"
                value={opt.value}
                checked={verdict === opt.value}
                onChange={(e) => setVerdict(e.target.value as VerdictOption)}
                className="sr-only"
                required
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="verdict-notes" className="flex items-center gap-1.5 text-sm font-medium text-navy-light mb-1">
          <MessageSquare size={14} />
          Notes (optional)
        </label>
        <textarea
          id="verdict-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe your experience, any issues, workarounds..."
          rows={3}
          maxLength={2000}
          className="w-full rounded-lg border border-ocean-300 bg-white px-3 py-2 text-sm text-navy placeholder:text-ocean-400 focus:border-ocean-600 focus:outline-none focus:ring-2 focus:ring-ocean-200 transition-all resize-none"
        />
      </div>

      {/* Evidence URL */}
      <div>
        <label htmlFor="evidence-url" className="flex items-center gap-1.5 text-sm font-medium text-navy-light mb-1">
          <Upload size={14} />
          Evidence URL (optional)
        </label>
        <input
          id="evidence-url"
          type="url"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder="Screenshot, video, or ClawBench result link"
          maxLength={500}
          className="w-full rounded-lg border border-ocean-300 bg-white px-3 py-2 text-sm text-navy placeholder:text-ocean-400 focus:border-ocean-600 focus:outline-none focus:ring-2 focus:ring-ocean-200 transition-all"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">Report submitted successfully!</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !selectedFork || !verdict}
          className="rounded-lg bg-ocean-800 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Report"}
        </button>
      </div>
    </form>
  );
}

function VerdictList({
  verdicts,
  userVotes,
  isSignedIn,
}: {
  verdicts: UserVerdict[];
  userVotes: Record<number, number>;
  isSignedIn: boolean;
}) {
  if (verdicts.length === 0) {
    return (
      <p className="text-sm text-navy-light text-center py-4">
        No community reports yet. Be the first to share your experience!
      </p>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      {verdicts.map((v) => (
        <VerdictCard
          key={v.id}
          verdict={v}
          currentVote={userVotes[v.id] ?? 0}
          isSignedIn={isSignedIn}
        />
      ))}
    </div>
  );
}

function VerdictCard({
  verdict,
  currentVote,
  isSignedIn,
}: {
  verdict: UserVerdict;
  currentVote: number;
  isSignedIn: boolean;
}) {
  const [voteState, setVoteState] = useState(currentVote);
  const [displayCount, setDisplayCount] = useState(verdict.vote_count);
  const [voting, setVoting] = useState(false);

  async function handleVote(vote: 1 | -1) {
    if (!isSignedIn || voting) return;
    setVoting(true);
    try {
      await voteVerdict(verdict.id, vote);
      const oldVote = voteState;
      const newVote = vote;
      // Calculate the display delta
      let delta = 0;
      if (oldVote === 0) {
        delta = newVote;
      } else if (oldVote === newVote) {
        // Clicking same vote again, but our DB replaces, so it stays the same
        delta = 0;
      } else {
        // Switching from +1 to -1 or vice versa
        delta = newVote - oldVote;
      }
      setDisplayCount((prev) => prev + delta);
      setVoteState(newVote);
    } catch {
      // Silently handle vote errors
    } finally {
      setVoting(false);
    }
  }

  const isVerified = displayCount >= 3;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-ocean-100 bg-white p-4">
      {/* Vote buttons */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <button
          onClick={() => handleVote(1)}
          disabled={!isSignedIn || voting}
          className={`rounded p-1 transition-colors ${
            voteState === 1
              ? "text-ocean-800 bg-ocean-100"
              : "text-navy-light hover:text-ocean-800 hover:bg-ocean-50 disabled:opacity-40 disabled:cursor-not-allowed"
          }`}
          title={isSignedIn ? "Upvote" : "Sign in to vote"}
        >
          <ThumbsUp size={16} />
        </button>
        <span className={`text-xs font-semibold ${displayCount > 0 ? "text-ocean-800" : displayCount < 0 ? "text-red-500" : "text-navy-light"}`}>
          {displayCount}
        </span>
        <button
          onClick={() => handleVote(-1)}
          disabled={!isSignedIn || voting}
          className={`rounded p-1 transition-colors ${
            voteState === -1
              ? "text-red-500 bg-red-50"
              : "text-navy-light hover:text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
          }`}
          title={isSignedIn ? "Downvote" : "Sign in to vote"}
        >
          <ThumbsDown size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <div className="flex items-center gap-1.5">
            {verdict.avatar_url && (
              <img src={verdict.avatar_url} alt="" className="h-5 w-5 rounded-full" />
            )}
            <span className="text-sm font-medium text-navy">{verdict.username}</span>
          </div>
          <VerdictBadge verdict={verdict.verdict} size="sm" />
          <span className="text-xs text-ocean-600 font-medium bg-ocean-50 px-2 py-0.5 rounded-full">
            {verdict.fork_name}
          </span>
          {isVerified && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              <ShieldCheck size={12} />
              Community Verified
            </span>
          )}
        </div>

        {verdict.notes && (
          <p className="text-sm text-navy-light mt-1 whitespace-pre-wrap">{verdict.notes}</p>
        )}

        <div className="flex items-center gap-3 mt-2">
          {verdict.evidence_url && (
            <a
              href={verdict.evidence_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-ocean-600 hover:text-ocean-800 transition-colors"
            >
              <Upload size={12} />
              View Evidence
            </a>
          )}
          <span className="text-xs text-navy-light">
            {new Date(verdict.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
