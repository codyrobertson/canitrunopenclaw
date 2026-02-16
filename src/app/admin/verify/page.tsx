"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, ShieldAlert, ShieldX, RefreshCw, Clock } from "lucide-react";

type Discrepancy = {
  field: string;
  stored: unknown;
  detected: unknown;
};

type Verification = {
  id: number;
  fork_id: number;
  fork_name: string;
  fork_slug: string;
  verified_at: string;
  repo_accessible: number;
  repo_stars: number | null;
  detected_language: string | null;
  detected_min_ram_mb: number | null;
  detected_features: string | null;
  readme_mentions: string | null;
  discrepancies: string | null;
  status: "pending" | "verified" | "discrepancy" | "inaccessible";
};

type ForkResult = {
  fork_slug: string;
  fork_name: string;
  github_url: string | null;
  verification: Verification | null;
};

const statusConfig = {
  verified: {
    icon: ShieldCheck,
    label: "Verified",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    dot: "bg-green-500",
  },
  discrepancy: {
    icon: ShieldAlert,
    label: "Discrepancy",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  inaccessible: {
    icon: ShieldX,
    label: "Inaccessible",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    bg: "bg-gray-50",
    text: "text-gray-500",
    border: "border-gray-200",
    dot: "bg-gray-400",
  },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseDiscrepancies(json: string | null): Discrepancy[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as Discrepancy[];
  } catch {
    return [];
  }
}

export default function AdminVerifyPage() {
  const [forks, setForks] = useState<ForkResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null); // slug or "all"
  const [error, setError] = useState<string | null>(null);

  const fetchVerifications = useCallback(async () => {
    try {
      const resp = await fetch("/api/verify-forks");
      if (!resp.ok) throw new Error("Failed to fetch");
      const data = (await resp.json()) as { results: ForkResult[] };
      setForks(data.results);
      setError(null);
    } catch {
      setError("Failed to load verification data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  async function triggerVerification(forkSlug?: string) {
    const key = forkSlug ?? "all";
    setVerifying(key);
    setError(null);
    try {
      const body = forkSlug ? { fork_slug: forkSlug } : {};
      const resp = await fetch("/api/verify-forks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const errData = (await resp.json()) as { error?: string };
        throw new Error(errData.error ?? "Verification failed");
      }
      // Refresh data
      await fetchVerifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(null);
    }
  }

  const verified = forks.filter(f => f.verification?.status === "verified").length;
  const discrepancies = forks.filter(f => f.verification?.status === "discrepancy").length;
  const inaccessible = forks.filter(f => f.verification?.status === "inaccessible").length;
  const pending = forks.filter(f => !f.verification || f.verification.status === "pending").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-navy">Fork Verification</h1>
          <p className="mt-1 text-navy-light">
            Verify stored fork data against live GitHub repositories.
          </p>
        </div>
        <button
          onClick={() => triggerVerification()}
          disabled={verifying !== null}
          className="flex items-center gap-2 rounded-lg bg-ocean-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-ocean-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw size={16} className={verifying === "all" ? "animate-spin" : ""} />
          {verifying === "all" ? "Verifying All..." : "Verify All Forks"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{verified}</div>
          <div className="text-xs text-green-600 mt-1">Verified</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{discrepancies}</div>
          <div className="text-xs text-amber-600 mt-1">Discrepancies</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{inaccessible}</div>
          <div className="text-xs text-red-600 mt-1">Inaccessible</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
          <div className="text-2xl font-bold text-gray-500">{pending}</div>
          <div className="text-xs text-gray-500 mt-1">Pending</div>
        </div>
      </div>

      {/* Fork table */}
      <div className="rounded-xl border border-ocean-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-navy-light">Loading verification data...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ocean-100 bg-ocean-50">
                <th className="text-left px-4 py-3 font-medium text-navy">Fork</th>
                <th className="text-left px-4 py-3 font-medium text-navy">Status</th>
                <th className="text-left px-4 py-3 font-medium text-navy">Stars</th>
                <th className="text-left px-4 py-3 font-medium text-navy">Language</th>
                <th className="text-left px-4 py-3 font-medium text-navy">Discrepancies</th>
                <th className="text-left px-4 py-3 font-medium text-navy">Verified At</th>
                <th className="text-right px-4 py-3 font-medium text-navy">Actions</th>
              </tr>
            </thead>
            <tbody>
              {forks.map((fork) => {
                const v = fork.verification;
                const status = v?.status ?? "pending";
                const config = statusConfig[status];
                const StatusIcon = config.icon;
                const discList = v ? parseDiscrepancies(v.discrepancies) : [];

                return (
                  <tr key={fork.fork_slug} className="border-b border-ocean-100 last:border-0 hover:bg-ocean-50/50 transition-colors">
                    {/* Fork name */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy">{fork.fork_name}</div>
                      {fork.github_url && (
                        <a
                          href={fork.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-ocean-600 hover:text-ocean-800"
                        >
                          {fork.github_url.replace("https://github.com/", "")}
                        </a>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
                        <StatusIcon size={14} />
                        {config.label}
                      </span>
                    </td>

                    {/* Stars */}
                    <td className="px-4 py-3 text-navy-light">
                      {v?.repo_stars !== null && v?.repo_stars !== undefined ? v.repo_stars.toLocaleString() : "-"}
                    </td>

                    {/* Language */}
                    <td className="px-4 py-3 text-navy-light">
                      {v?.detected_language ?? "-"}
                    </td>

                    {/* Discrepancies */}
                    <td className="px-4 py-3">
                      {discList.length > 0 ? (
                        <div className="space-y-1">
                          {discList.map((d, i) => (
                            <div key={i} className="text-xs">
                              <span className="font-medium text-amber-700">{d.field}:</span>{" "}
                              <span className="text-navy-light">
                                stored=<span className="line-through">{JSON.stringify(d.stored)}</span>{" "}
                                detected=<span className="font-medium text-navy">{JSON.stringify(d.detected)}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-navy-light">-</span>
                      )}
                    </td>

                    {/* Verified at */}
                    <td className="px-4 py-3 text-xs text-navy-light">
                      {v?.verified_at ? formatDate(v.verified_at) : "Never"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => triggerVerification(fork.fork_slug)}
                        disabled={verifying !== null}
                        className="inline-flex items-center gap-1 rounded-md border border-ocean-200 px-2.5 py-1.5 text-xs font-medium text-navy hover:bg-ocean-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <RefreshCw size={12} className={verifying === fork.fork_slug ? "animate-spin" : ""} />
                        {verifying === fork.fork_slug ? "..." : "Verify"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
