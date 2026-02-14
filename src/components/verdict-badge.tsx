const VERDICT_CONFIG = {
  RUNS_GREAT: { label: "Runs Great", color: "bg-verdict-great text-white", icon: "\u{1F30A}" },
  RUNS_OK: { label: "Runs OK", color: "bg-verdict-ok text-white", icon: "\u2693" },
  BARELY_RUNS: { label: "Barely Runs", color: "bg-verdict-barely text-white", icon: "\u{1F536}" },
  WONT_RUN: { label: "Won't Run", color: "bg-verdict-wont text-white", icon: "\u2620\uFE0F" },
} as const;

export function VerdictBadge({ verdict, size = "md" }: { verdict: string; size?: "sm" | "md" | "lg" }) {
  const config = VERDICT_CONFIG[verdict as keyof typeof VERDICT_CONFIG];
  if (!config) return null;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.color} ${sizeClasses[size]}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
