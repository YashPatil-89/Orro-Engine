import { AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function WarningBanner({
  tone = "warning",
  title,
  children,
}: {
  tone?: "warning" | "danger" | "info";
  title: string;
  children?: ReactNode;
}) {
  const cls =
    tone === "danger"
      ? "border-destructive/30 bg-destructive/5 text-destructive"
      : tone === "info"
        ? "border-gold/40 bg-gold-soft text-accent-foreground"
        : "border-warning/30 bg-warning-soft text-warning";
  const Icon = tone === "info" ? Info : AlertTriangle;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("animate-rise rounded-2xl border p-4", cls)}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{title}</p>
          {children && <div className="text-foreground/80">{children}</div>}
        </div>
      </div>
    </div>
  );
}
