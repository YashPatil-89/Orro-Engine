import { CheckCircle2, AlertTriangle, Gauge, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleResult } from "@/types";

const STYLES = {
  comfortable: { label: "Comfortable", cls: "bg-success-soft text-success", Icon: CheckCircle2 },
  compressed: { label: "Compressed", cls: "bg-warning-soft text-warning", Icon: Gauge },
  infeasible: { label: "Infeasible", cls: "bg-destructive/10 text-destructive", Icon: AlertTriangle },
};

export function StatusBadge({ status }: { status: ScheduleResult["status"] }) {
  const s = STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", s.cls)}>
      <s.Icon className="h-3.5 w-3.5" aria-hidden /> {s.label}
    </span>
  );
}

export function SafetyBadge({ valid, count }: { valid: boolean; count: number }) {
  return valid ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> All rest periods safe
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
      <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> {count} safety issue{count > 1 ? "s" : ""}
    </span>
  );
}
