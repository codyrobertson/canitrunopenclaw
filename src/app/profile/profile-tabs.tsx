"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ThumbsUp,
  Star,
  FlaskConical,
  GitFork,
  Plus,
  Settings,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  ChevronRight,
  User,
  Compass,
} from "lucide-react";
import { submitFork, updateProfile } from "@/app/actions";

type Verdict = {
  id: number;
  verdict: string;
  notes: string | null;
  created_at: Date;
  device_name: string;
  device_slug: string;
  fork_name: string;
  fork_slug: string;
};

type Rating = {
  stars: number;
  device_name: string;
  device_slug: string;
  fork_name: string;
};

type BenchmarkRun = {
  id: number;
  status: string;
  started_at: Date;
  device_name: string;
  device_slug: string;
  fork_name: string;
};

type Submission = {
  id: number;
  name: string;
  github_url: string;
  description: string | null;
  language: string | null;
  status: string;
  reviewer_notes: string | null;
  created_at: Date;
};

const verdictColors: Record<string, string> = {
  RUNS_GREAT: "bg-verdict-great/10 text-verdict-great ring-1 ring-verdict-great/20",
  RUNS_OK: "bg-verdict-ok/10 text-verdict-ok ring-1 ring-verdict-ok/20",
  BARELY_RUNS: "bg-verdict-barely/10 text-verdict-barely ring-1 ring-verdict-barely/20",
  WONT_RUN: "bg-verdict-wont/10 text-verdict-wont ring-1 ring-verdict-wont/20",
};

const verdictLabels: Record<string, string> = {
  RUNS_GREAT: "Runs Great",
  RUNS_OK: "Runs OK",
  BARELY_RUNS: "Barely Runs",
  WONT_RUN: "Won't Run",
};

const statusConfig: Record<string, { icon: React.ReactNode; className: string }> = {
  pending: {
    icon: <Clock size={13} />,
    className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  },
  approved: {
    icon: <CheckCircle2 size={13} />,
    className: "bg-green-50 text-green-700 ring-1 ring-green-200",
  },
  rejected: {
    icon: <XCircle size={13} />,
    className: "bg-red-50 text-red-700 ring-1 ring-red-200",
  },
  completed: {
    icon: <CheckCircle2 size={13} />,
    className: "bg-green-50 text-green-700 ring-1 ring-green-200",
  },
  running: {
    icon: <Loader2 size={13} className="animate-spin" />,
    className: "bg-ocean-50 text-ocean-700 ring-1 ring-ocean-200",
  },
  failed: {
    icon: <XCircle size={13} />,
    className: "bg-red-50 text-red-700 ring-1 ring-red-200",
  },
};

type Tab = "activity" | "submissions" | "settings";

const tabConfig: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "activity", label: "Activity", icon: <Compass size={15} /> },
  { id: "submissions", label: "Submissions", icon: <GitFork size={15} /> },
  { id: "settings", label: "Settings", icon: <Settings size={15} /> },
];

export function ProfileTabs({
  verdicts,
  ratings,
  benchmarkRuns,
  submissions,
  userName,
}: {
  verdicts: Verdict[];
  ratings: Rating[];
  benchmarkRuns: BenchmarkRun[];
  submissions: Submission[];
  userName: string;
}) {
  const [tab, setTab] = useState<Tab>("activity");

  const counts: Record<Tab, number | undefined> = {
    activity: verdicts.length + ratings.length + benchmarkRuns.length || undefined,
    submissions: submissions.length || undefined,
    settings: undefined,
  };

  return (
    <div className="mt-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-white border border-ocean-100 p-1 shadow-sm">
        {tabConfig.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all cursor-pointer ${
              tab === t.id
                ? "bg-ocean-800 text-white shadow-sm"
                : "text-navy-light hover:text-navy hover:bg-ocean-50"
            }`}
          >
            {t.icon}
            <span className="hidden xs:inline">{t.label}</span>
            {counts[t.id] !== undefined && (
              <span
                className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                  tab === t.id
                    ? "bg-white/20 text-white"
                    : "bg-ocean-200 text-ocean-700"
                }`}
              >
                {counts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-5">
        {tab === "activity" && (
          <ActivityTab verdicts={verdicts} ratings={ratings} benchmarkRuns={benchmarkRuns} />
        )}
        {tab === "submissions" && <SubmissionsTab submissions={submissions} />}
        {tab === "settings" && <SettingsTab userName={userName} />}
      </div>
    </div>
  );
}

/* ─── Activity ──────────────────────────────────────── */

function ActivityTab({
  verdicts,
  ratings,
  benchmarkRuns,
}: {
  verdicts: Verdict[];
  ratings: Rating[];
  benchmarkRuns: BenchmarkRun[];
}) {
  const hasActivity = verdicts.length > 0 || ratings.length > 0 || benchmarkRuns.length > 0;

  if (!hasActivity) {
    return (
      <EmptyState
        icon={<ThumbsUp className="h-8 w-8 text-ocean-400" />}
        title="No activity yet"
        description="Start by browsing devices and submitting compatibility verdicts."
        actionLabel="Browse Devices"
        actionHref="/devices"
      />
    );
  }

  return (
    <div className="space-y-6">
      {verdicts.length > 0 && (
        <SectionCard
          icon={<ThumbsUp size={15} />}
          title="Verdicts"
          count={verdicts.length}
        >
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ocean-100 text-left text-xs font-medium uppercase tracking-wider text-navy-light/70">
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Fork</th>
                  <th className="px-4 py-3">Verdict</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean-50">
                {verdicts.map((v) => (
                  <tr key={v.id} className="group hover:bg-ocean-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/devices/${v.device_slug}`} className="font-medium text-navy hover:text-ocean-700 transition-colors">
                        {v.device_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/forks/${v.fork_slug}`} className="text-ocean-600 hover:text-ocean-800 transition-colors">
                        {v.fork_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${verdictColors[v.verdict] ?? "bg-gray-100 text-gray-600"}`}>
                        {verdictLabels[v.verdict] ?? v.verdict}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-navy-light text-xs max-w-[220px] truncate">
                      {v.notes || <span className="text-ocean-300">--</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-ocean-50">
            {verdicts.map((v) => (
              <div key={v.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/devices/${v.device_slug}`} className="font-medium text-sm text-navy hover:text-ocean-700 transition-colors">
                    {v.device_name}
                  </Link>
                  <p className="text-xs text-ocean-600 mt-0.5">{v.fork_name}</p>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${verdictColors[v.verdict] ?? "bg-gray-100 text-gray-600"}`}>
                  {verdictLabels[v.verdict] ?? v.verdict}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {ratings.length > 0 && (
        <SectionCard
          icon={<Star size={15} />}
          title="Ratings"
          count={ratings.length}
        >
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ocean-100 text-left text-xs font-medium uppercase tracking-wider text-navy-light/70">
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Fork</th>
                  <th className="px-4 py-3">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean-50">
                {ratings.map((r, i) => (
                  <tr key={i} className="group hover:bg-ocean-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/devices/${r.device_slug}`} className="font-medium text-navy hover:text-ocean-700 transition-colors">
                        {r.device_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ocean-600">{r.fork_name}</td>
                    <td className="px-4 py-3">
                      <Stars count={r.stars} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-ocean-50">
            {ratings.map((r, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/devices/${r.device_slug}`} className="font-medium text-sm text-navy hover:text-ocean-700 transition-colors">
                    {r.device_name}
                  </Link>
                  <p className="text-xs text-ocean-600 mt-0.5">{r.fork_name}</p>
                </div>
                <Stars count={r.stars} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {benchmarkRuns.length > 0 && (
        <SectionCard
          icon={<FlaskConical size={15} />}
          title="Benchmark Runs"
          count={benchmarkRuns.length}
        >
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ocean-100 text-left text-xs font-medium uppercase tracking-wider text-navy-light/70">
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Fork</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean-50">
                {benchmarkRuns.map((run) => (
                  <tr key={run.id} className="group hover:bg-ocean-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/devices/${run.device_slug}`} className="font-medium text-navy hover:text-ocean-700 transition-colors">
                        {run.device_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ocean-600">{run.fork_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-4 py-3 text-navy-light text-xs">
                      {new Date(run.started_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-ocean-50">
            {benchmarkRuns.map((run) => (
              <div key={run.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/devices/${run.device_slug}`} className="font-medium text-sm text-navy hover:text-ocean-700 transition-colors">
                    {run.device_name}
                  </Link>
                  <p className="text-xs text-ocean-600 mt-0.5">{run.fork_name}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <StatusBadge status={run.status} />
                  <span className="text-[10px] text-navy-light">
                    {new Date(run.started_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ─── Submissions ───────────────────────────────────── */

function SubmissionsTab({ submissions }: { submissions: Submission[] }) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      try {
        await submitFork(
          data.get("name") as string,
          data.get("github_url") as string,
          data.get("description") as string,
          data.get("language") as string
        );
        setSuccess(true);
        form.reset();
        setShowForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-heading text-base font-semibold text-navy">
          <GitFork size={16} className="text-ocean-600" />
          Fork Submissions
        </h3>
        <button
          onClick={() => { setShowForm(!showForm); setSuccess(false); }}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all cursor-pointer ${
            showForm
              ? "bg-ocean-50 text-ocean-800 ring-1 ring-ocean-200"
              : "bg-ocean-800 text-white hover:bg-ocean-700 shadow-sm"
          }`}
        >
          <Plus size={14} className={showForm ? "rotate-45 transition-transform" : "transition-transform"} />
          {showForm ? "Cancel" : "Submit a Fork"}
        </button>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 ring-1 ring-green-200 px-4 py-3.5">
          <CheckCircle2 size={18} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Fork submitted successfully!</p>
            <p className="text-xs text-green-600 mt-0.5">Our team will review it and add it to the directory.</p>
          </div>
        </div>
      )}

      {/* Submission form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl bg-white ring-1 ring-ocean-200 shadow-sm overflow-hidden">
          <div className="border-b border-ocean-100 bg-ocean-50/50 px-5 py-3.5">
            <h4 className="font-heading text-sm font-semibold text-navy">Submit a New Fork</h4>
            <p className="text-xs text-navy-light mt-0.5">
              Know an OpenClaw fork that&apos;s not listed? Submit it for review.
            </p>
          </div>

          <div className="p-5">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 ring-1 ring-red-200 px-3 py-2.5 text-sm text-red-800">
                <XCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField name="name" label="Fork Name" required placeholder="e.g. CrabClaw" maxLength={100} />
              <InputField name="github_url" label="GitHub URL" required type="url" placeholder="https://github.com/user/fork" />
              <InputField name="language" label="Primary Language" placeholder="e.g. Python, Rust, Go" maxLength={50} />
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-navy mb-1.5">Description</label>
                <textarea
                  name="description"
                  maxLength={1000}
                  rows={3}
                  className="w-full rounded-lg bg-white px-3 py-2.5 text-sm text-navy placeholder:text-gray-400 ring-1 ring-gray-300 focus:ring-2 focus:ring-ocean-500 outline-none transition-shadow resize-none"
                  placeholder="Brief description of the fork and what makes it unique..."
                />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 pt-4 border-t border-ocean-100">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg bg-ocean-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-700 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Submit for Review
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg px-4 py-2.5 text-sm text-navy-light hover:text-navy hover:bg-ocean-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Submissions list */}
      {submissions.length > 0 ? (
        <SectionCard>
          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ocean-100 text-left text-xs font-medium uppercase tracking-wider text-navy-light/70">
                  <th className="px-4 py-3">Fork</th>
                  <th className="px-4 py-3">Language</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean-50">
                {submissions.map((s) => (
                  <tr key={s.id} className="group hover:bg-ocean-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={s.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-navy hover:text-ocean-700 transition-colors"
                        >
                          {s.name}
                        </a>
                        <ExternalLink size={11} className="text-ocean-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {s.description && (
                        <p className="text-xs text-navy-light mt-0.5 truncate max-w-[280px]">{s.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-navy-light text-xs">{s.language ?? <span className="text-ocean-300">--</span>}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                      {s.reviewer_notes && (
                        <p className="text-[11px] text-navy-light mt-1 max-w-[200px]">{s.reviewer_notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-navy-light text-xs">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden divide-y divide-ocean-50">
            {submissions.map((s) => (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <a
                    href={s.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm text-navy hover:text-ocean-700 transition-colors flex items-center gap-1"
                  >
                    {s.name}
                    <ExternalLink size={11} className="text-ocean-400" />
                  </a>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-navy-light">
                  {s.language && <span>{s.language}</span>}
                  <span>{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : (
        !showForm && (
          <EmptyState
            icon={<GitFork className="h-8 w-8 text-ocean-400" />}
            title="No submissions yet"
            description="Know an OpenClaw fork that's not listed? Submit it for review."
          />
        )
      )}
    </div>
  );
}

/* ─── Settings ──────────────────────────────────────── */

function SettingsTab({ userName }: { userName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateProfile(data.get("name") as string);
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Profile settings card */}
      <div className="rounded-xl bg-white ring-1 ring-ocean-200 shadow-sm overflow-hidden">
        <div className="border-b border-ocean-100 bg-ocean-50/50 px-5 py-3.5">
          <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-navy">
            <User size={15} className="text-ocean-600" />
            Profile Information
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 ring-1 ring-red-200 px-3 py-2.5 text-sm text-red-800">
              <XCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 ring-1 ring-green-200 px-3 py-2.5 text-sm text-green-800">
              <CheckCircle2 size={14} className="shrink-0" />
              Profile updated successfully!
            </div>
          )}

          <div className="max-w-sm">
            <InputField
              name="name"
              label="Display Name"
              required
              maxLength={100}
              defaultValue={userName}
              hint="This is how your name appears on verdicts and comments."
            />
          </div>

          <div className="mt-5 pt-4 border-t border-ocean-100">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-ocean-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-700 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Shared components ─────────────────────────────── */

function SectionCard({
  icon,
  title,
  count,
  children,
}: {
  icon?: React.ReactNode;
  title?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-ocean-100 shadow-sm overflow-hidden">
      {title && (
        <div className="flex items-center gap-2 border-b border-ocean-100 px-4 py-3">
          <span className="text-ocean-600">{icon}</span>
          <h3 className="font-heading text-sm font-semibold text-navy">{title}</h3>
          {count !== undefined && (
            <span className="ml-auto rounded-full bg-ocean-50 px-2 py-0.5 text-[10px] font-semibold text-ocean-600 ring-1 ring-ocean-100">
              {count}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    icon: null,
    className: "bg-gray-50 text-gray-600 ring-1 ring-gray-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${config.className}`}>
      {config.icon}
      {status}
    </span>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, j) => (
        <Star
          key={j}
          size={13}
          className={j < count ? "fill-amber-400 text-amber-400" : "text-ocean-200"}
        />
      ))}
    </div>
  );
}

function InputField({
  name,
  label,
  required,
  type = "text",
  placeholder,
  maxLength,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-semibold text-navy mb-1.5">
        {label}
        {required && <span className="text-ocean-500 ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        type={type}
        maxLength={maxLength}
        defaultValue={defaultValue}
        className="w-full rounded-lg bg-white px-3 py-2.5 text-sm text-navy placeholder:text-gray-400 ring-1 ring-gray-300 focus:ring-2 focus:ring-ocean-500 outline-none transition-shadow"
        placeholder={placeholder}
      />
      {hint && <p className="mt-1.5 text-[11px] text-navy-light leading-snug">{hint}</p>}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-white ring-1 ring-ocean-100 py-14 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ocean-50 ring-1 ring-ocean-100">
        {icon}
      </div>
      <h3 className="mt-4 font-heading text-base font-semibold text-navy">{title}</h3>
      <p className="mt-1.5 text-sm text-navy-light max-w-xs">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-ocean-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-ocean-700 transition-colors shadow-sm"
        >
          {actionLabel}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}
