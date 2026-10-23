import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { daysBetween, prettyDay } from "@/engine";
import { useBridalStore } from "@/store/useBridalStore";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";

export function BrideRoster() {
  const s = useBridalStore();
  const navigate = useNavigate();
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Brides</h2>
          <p className="text-xs text-muted-foreground">Each bride has her own plan and login. Tap one to work on her plan.</p>
        </div>
        <Button
          size="sm"
          className="rounded-full"
          onClick={() => {
            s.startNewBride();
            navigate({ to: "/" });
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> New bride
        </Button>
      </div>
      {s.brides.length === 0 && <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">No brides yet.</p>}
      <ul className="space-y-2">
        {s.brides.map((b) => {
          const active = b.id === s.activeBrideId;
          const next = b.schedule?.sessions.find((x) => x.status === "upcoming");
          const status = b.extraUnplaced.length ? "infeasible" : b.schedule?.status;
          return (
            <li key={b.id} className={cn("rounded-2xl border p-3", active && "border-gold shadow-glow")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Wedding {prettyDay(b.weddingDate)} · {daysBetween(s.today, b.weddingDate)} days · next: {next ? prettyDay(next.date) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Login: {b.email} / {b.password}</p>
                </div>
                {status && <StatusBadge status={status} />}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant={active ? "default" : "outline"} className="rounded-full" onClick={() => { s.selectBride(b.id); navigate({ to: "/timeline" }); }}>
                  Open plan
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { s.selectBride(b.id); navigate({ to: "/" }); }}>
                  Edit plan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto rounded-full text-destructive"
                  aria-label={`Remove ${b.name}`}
                  onClick={() => { s.deleteBride(b.id); toast(`${b.name} removed.`); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
