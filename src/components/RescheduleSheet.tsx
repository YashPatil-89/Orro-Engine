import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getTreatment } from "@/data/treatments";
import { explainDate, fromDay, longDay, prettyDay, shiftDay, toDay, daysBetween } from "@/engine";
import { useBridalStore } from "@/store/useBridalStore";
import type { Session } from "@/types";

export function RescheduleSheet({ session, onClose }: { session: Session | null; onClose: () => void }) {
  const store = useBridalStore();
  const [error, setError] = useState<{ message: string; suggested?: string } | null>(null);
  const state = { weddingDate: store.weddingDate, today: store.today, sessions: store.schedule?.sessions ?? [], capacityMap: store.capacityMap, config: store.config };

  // Collect why dates are unavailable so the bride understands the greyed-out days.
  const reasons = useMemo(() => {
    if (!session) return [];
    const out = new Map<string, number>();
    const span = daysBetween(store.today, store.weddingDate);
    for (let i = 1; i <= span; i++) {
      const r = explainDate(state, session.id, shiftDay(store.today, i));
      if (r) out.set(r.replace(/ on \w+ \d+/, ""), (out.get(r) ?? 0) + 1);
    }
    return [...out.keys()].slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, store.schedule, store.capacityMap, store.config]);

  const tryDate = (d: string) => {
    if (!session) return;
    const out = store.reschedule(session.id, d);
    if (out.ok) {
      toast.success(`${getTreatment(session.treatmentId).name} moved to ${prettyDay(d)}.${out.changedIds.length > 1 ? ` ${out.changedIds.length - 1} other session(s) adjusted.` : ""}`);
      setError(null);
      onClose();
    } else setError({ message: out.message, suggested: out.suggestedDate });
  };

  return (
    <Sheet open={!!session} onOpenChange={(o) => { if (!o) { setError(null); onClose(); } }}>
      <SheetContent side="bottom" className="mx-auto max-h-[90vh] max-w-lg overflow-y-auto rounded-t-3xl">
        {session && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">Reschedule {getTreatment(session.treatmentId).name}</SheetTitle>
              <SheetDescription>Currently {longDay(session.date)}. Unavailable days are greyed out.</SheetDescription>
            </SheetHeader>
            <div className="flex justify-center py-2">
              <Calendar
                mode="single"
                selected={fromDay(session.date)}
                defaultMonth={fromDay(session.date)}
                onSelect={(d) => d && tryDate(toDay(d))}
                disabled={(d) => !!explainDate(state, session.id, toDay(d))}
                className="pointer-events-auto rounded-2xl border p-3"
              />
            </div>
            {error && (
              <div role="alert" className="space-y-2 rounded-2xl bg-destructive/5 p-3 text-sm text-destructive">
                <p>{error.message}</p>
                {error.suggested && (
                  <Button size="sm" className="rounded-full" onClick={() => tryDate(error.suggested!)}>Use {prettyDay(error.suggested)}</Button>
                )}
              </div>
            )}
            {reasons.length > 0 && (
              <div className="space-y-1 px-1 pb-4 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Why some days are unavailable</p>
                {reasons.map((r) => (
                  <p key={r}>• {r}</p>
                ))}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
