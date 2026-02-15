import { Waves, Anchor, AlertTriangle, XCircle, type LucideIcon } from "lucide-react";

const VERDICT_CONFIG: Record<string, { label: string; color: string; Icon: LucideIcon }> = {
  RUNS_GREAT: { label: "Runs Great", color: "bg-verdict-great text-white", Icon: Waves },
  RUNS_OK: { label: "Runs OK", color: "bg-verdict-ok text-white", Icon: Anchor },
  BARELY_RUNS: { label: "Barely Runs", color: "bg-verdict-barely text-white", Icon: AlertTriangle },
  WONT_RUN: { label: "Won't Run", color: "bg-verdict-wont text-white", Icon: XCircle },
};

export function VerdictBadge({ verdict, size = "md" }: { verdict: string; size?: "sm" | "md" | "lg" }) {
  const config = VERDICT_CONFIG[verdict];
  if (!config) return null;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const iconSize = { sm: 12, md: 14, lg: 18 };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.color} ${sizeClasses[size]}`}>
      <config.Icon size={iconSize[size]} />
      {config.label}
    </span>
  );
}
