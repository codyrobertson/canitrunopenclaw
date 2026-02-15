"use client";

import { useState } from "react";
import Link from "next/link";
import { Timer, Cpu, CheckCircle, Gauge, ChevronDown, ChevronUp, Zap, MemoryStick, Users } from "lucide-react";
import type { BenchmarkSummary, BenchmarkResult } from "@/lib/queries";

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-navy-light">N/A</span>;

  let color = "bg-verdict-wont text-white";
  if (score >= 80) color = "bg-verdict-great text-white";
  else if (score >= 60) color = "bg-verdict-ok text-white";
  else if (score >= 40) color = "bg-verdict-barely text-white";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold ${color}`}>
      <Gauge size={14} />
      {score}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, unit, color }: {
  icon: React.ElementType;
  label: string;
  value: number | null;
  unit: string;
  color: string;
}) {
  if (value === null) return null;
  return (
    <div className="rounded-lg bg-ocean-50 p-3 text-center">
      <Icon size={16} className={`mx-auto mb-1 ${color}`} />
      <div className="text-lg font-semibold text-navy">
        {typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
        <span className="text-xs text-navy-light ml-0.5">{unit}</span>
      </div>
      <div className="text-xs text-navy-light">{label}</div>
    </div>
  );
}

function BenchmarkRow({ summary, details, onToggle, expanded }: {
  summary: BenchmarkSummary;
  details: BenchmarkResult[];
  onToggle: () => void;
  expanded: boolean;
}) {
  return (
    <div className="rounded-lg border border-ocean-100 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-ocean-50/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/forks/${summary.fork_slug}`}
              className="font-medium text-navy hover:text-ocean-800"
              onClick={(e) => e.stopPropagation()}
            >
              {summary.fork_name}
            </Link>
            <ScoreBadge score={summary.overall_score} />
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-navy-light">
            {summary.cold_start_ms !== null && (
              <span className="flex items-center gap-1">
                <Timer size={12} className="text-ocean-600" />
                {summary.cold_start_ms.toFixed(0)}ms cold
              </span>
            )}
            {summary.warm_response_ms !== null && (
              <span className="flex items-center gap-1">
                <Zap size={12} className="text-amber-500" />
                {summary.warm_response_ms.toFixed(0)}ms warm
              </span>
            )}
            {summary.peak_memory_mb !== null && (
              <span className="flex items-center gap-1">
                <MemoryStick size={12} className="text-purple-500" />
                {summary.peak_memory_mb.toFixed(0)}MB
              </span>
            )}
            {summary.capabilities_total > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle size={12} className="text-green-500" />
                {summary.capabilities_passed}/{summary.capabilities_total} caps
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-navy-light">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-ocean-100 bg-ocean-50/30 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <MetricCard icon={Timer} label="Cold Start" value={summary.cold_start_ms} unit="ms" color="text-ocean-600" />
            <MetricCard icon={Zap} label="Warm Response" value={summary.warm_response_ms} unit="ms" color="text-amber-500" />
            <MetricCard icon={MemoryStick} label="Peak Memory" value={summary.peak_memory_mb} unit="MB" color="text-purple-500" />
            <MetricCard icon={Cpu} label="CPU Average" value={summary.cpu_avg_percent} unit="%" color="text-blue-500" />
            <MetricCard icon={Users} label="Max Concurrent" value={summary.max_concurrent} unit="" color="text-indigo-500" />
          </div>

          {/* Capability breakdown */}
          {details.filter(d => d.category === "capability").length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-navy-light uppercase tracking-wider mb-2">Capabilities</h4>
              <div className="flex flex-wrap gap-2">
                {details.filter(d => d.category === "capability").map((cap) => (
                  <span
                    key={cap.id}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      cap.value === 1
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {cap.value === 1 ? <CheckCircle size={10} /> : <span className="w-2.5 h-2.5 rounded-full bg-red-300" />}
                    {cap.metric.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* All metrics table */}
          {details.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-navy-light uppercase tracking-wider mb-2">All Metrics</h4>
              <div className="rounded-lg border border-ocean-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-ocean-50">
                      <th className="text-left px-3 py-1.5 font-medium text-navy-light">Metric</th>
                      <th className="text-right px-3 py-1.5 font-medium text-navy-light">Value</th>
                      <th className="text-left px-3 py-1.5 font-medium text-navy-light">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((d) => (
                      <tr key={d.id} className="border-t border-ocean-50">
                        <td className="px-3 py-1.5 text-navy">{d.metric.replace(/_/g, " ")}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-navy">
                          {d.category === "capability" ? (d.value === 1 ? "pass" : "fail") : `${d.value} ${d.unit}`}
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            d.category === "latency" ? "bg-blue-50 text-blue-600" :
                            d.category === "capability" ? "bg-green-50 text-green-600" :
                            "bg-purple-50 text-purple-600"
                          }`}>
                            {d.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-3 text-[10px] text-navy-light">
            Tested {summary.started_at ? new Date(summary.started_at).toLocaleDateString() : "unknown"}
            {summary.completed_at && ` - completed ${new Date(summary.completed_at).toLocaleDateString()}`}
          </div>
        </div>
      )}
    </div>
  );
}

export function BenchmarkResults({ benchmarks, detailsByRunId }: {
  benchmarks: BenchmarkSummary[];
  detailsByRunId: Record<number, BenchmarkResult[]>;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (benchmarks.length === 0) {
    return (
      <div className="text-center py-6">
        <Gauge size={32} className="mx-auto mb-2 text-ocean-300" />
        <p className="text-sm text-navy-light">No benchmark data yet.</p>
        <p className="text-xs text-navy-light mt-1">
          Run <code className="bg-ocean-50 px-1 py-0.5 rounded text-ocean-800">./clawbench/run.sh &lt;device&gt; &lt;fork&gt;</code> to generate benchmarks.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-heading text-lg font-semibold text-navy">ClawBench Results</h2>
          <p className="text-xs text-navy-light mt-0.5">Automated performance benchmarks from Docker-constrained environments.</p>
        </div>
        <span className="text-xs text-navy-light">{benchmarks.length} benchmark{benchmarks.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-3">
        {benchmarks.map((b) => (
          <BenchmarkRow
            key={b.run_id}
            summary={b}
            details={detailsByRunId[b.run_id] ?? []}
            expanded={expandedId === b.run_id}
            onToggle={() => setExpandedId(expandedId === b.run_id ? null : b.run_id)}
          />
        ))}
      </div>
    </div>
  );
}
