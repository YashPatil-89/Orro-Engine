import { Check, ChevronDown, Clock, MoveRight, Sparkles, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getTreatment } from "@/data/treatments";
import { longDay } from "@/engine";
import type { Session } from "@/types";
import { dynamicPrep, whenLabel } from "@/utils/prep";
import { cn } from "@/lib/utils";

export function SessionCard({
  session,
  today,
  isNext,
  highlight,
  onReschedule,
  onComplete,
  onMissed,
  canComplete = true,
}: {
  session: Session;
  today: string;
  isNext: boolean;
  highlight: boolean;
  onReschedule: () => void;
  onComplete: () => void;
  onMissed: () => void;
  canComplete?: boolean;
}) {
  const t = getTreatment(session.treatmentId);
  const [open, setOpen] = useState(isNext);
  const done = session.status === "completed";
  const missed = session.status === "missed";

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-soft transition-all",
        isNext && "border-gold shadow-glow",
        (done || missed) && "bg-muted/60 opacity-75 shadow-none",
        highlight && "animate-highlight",
      )}
      aria-label={`${t.name}, session ${session.sequenceNumber} of ${session.totalOfThisTreatment}`}
    >
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-start gap-3 text-left">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full",
            done ? "bg-success-soft text-success" : missed ? "bg-destructive/10 text-destructive" : t.category === "intensive" ? "bg-blush text-primary" : "bg-gold-soft text-accent-foreground",
          )}
        >
          {done ? <Check className="h-5 w-5" /> : missed ? <XCircle className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isNext && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Next up</span>}
            {missed && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">Missed</span>}
            {done && <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold uppercase text-success">Completed</span>}
            {session.shifted && !missed && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold uppercase text-warning">Moved</span>}
          </div>
          <h3 className={cn("mt-1 font-display text-lg font-semibold", missed && "line-through")}>{t.name}</h3>
          <p className="text-sm text-muted-foreground">
            {longDay(session.date)} · {session.time} · {t.durationMin} min
          </p>
          <p className="text-xs text-muted-foreground">
            Session {session.sequenceNumber} of {session.totalOfThisTreatment} · {whenLabel(session.date, today)}
          </p>
        </div>
        <ChevronDown className={cn("mt-2 h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="animate-rise mt-4 space-y-3 border-t pt-4 text-sm">
          {session.shiftReason && (
            <p className="flex gap-2 rounded-xl bg-warning-soft p-3 text-foreground/80">
              <MoveRight className="mt-0.5 h-4 w-4 shrink-0 text-warning" /> {session.shiftReason}
            </p>
          )}
          {!done && !missed && (
            <div className="rounded-xl bg-blush-soft p-3">
              <p className="flex items-center gap-1.5 font-semibold"><Clock className="h-4 w-4" /> Before your session</p>
              <p className="mt-1 font-medium text-secondary-foreground">{dynamicPrep(session, today)}</p>
              <p className="mt-1 text-foreground/75">{t.prepInstructions}</p>
            </div>
          )}
          <div className="rounded-xl bg-gold-soft p-3">
            <p className="font-semibold">Aftercare</p>
            <p className="mt-1 text-foreground/75">{t.aftercareInstructions}</p>
          </div>
          {session.status === "upcoming" && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="rounded-full" onClick={onReschedule}>Reschedule</Button>
              {canComplete && <Button size="sm" variant="secondary" className="rounded-full" onClick={onComplete}>Mark completed</Button>}
              <Button size="sm" variant="ghost" className="rounded-full text-destructive" onClick={onMissed}>{canComplete ? "Missed" : "I can't make it"}</Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
