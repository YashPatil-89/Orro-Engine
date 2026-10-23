import { Heart } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { CountdownHeader } from "@/components/CountdownHeader";
import { EmptyPlan } from "@/components/EmptyPlan";
import { RescheduleSheet } from "@/components/RescheduleSheet";
import { RestConnector } from "@/components/RestConnector";
import { TimelineItem } from "@/components/TimelineItem";
import { WarningBanner } from "@/components/WarningBanner";
import { getTreatment } from "@/data/treatments";
import { daysBetween, longDay, validateSchedule } from "@/engine";
import { useBridalStore } from "@/store/useBridalStore";
import type { Session } from "@/types";
import { restLabel } from "@/utils/prep";

export function TimelinePage() {
  const s = useBridalStore();
  const [editing, setEditing] = useState<Session | null>(null);
  const sessions = s.schedule?.sessions ?? [];
  const validation = useMemo(
    () => validateSchedule(sessions, s.weddingDate, { today: s.today, capacityMap: s.capacityMap, config: s.config }),
    [sessions, s.weddingDate, s.today, s.capacityMap, s.config],
  );
  if (!s.schedule || !s.weddingDate) return <EmptyPlan />;

  const schedule = s.schedule;
  const unplaced = [...schedule.unplaced, ...s.extraUnplaced];
  const nextId = sessions.find((x) => x.status === "upcoming")?.id;
  const changed = new Set(s.changedIds);
  const shifted = sessions.filter((x) => x.shifted && x.status === "upcoming").length;

  return (
    <div className="space-y-5">
      {s.role === "clinic" && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Staff view · {s.brideName || "Bride"}'s plan</p>
          <select aria-label="Switch bride" value={s.activeBrideId ?? ""} onChange={(e) => s.selectBride(e.target.value)} className="rounded-full border bg-card px-3 py-1.5 text-xs">
            {s.brides.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}
      <CountdownHeader
        brideName={s.brideName}
        weddingDate={s.weddingDate}
        today={s.today}
        status={unplaced.length ? "infeasible" : schedule.status}
        valid={validation.valid}
        violations={validation.violations.length}
      />

      {schedule.status === "compressed" && (
        <WarningBanner title="Your timeline is compressed">
          Rest periods were shortened to {Math.round(schedule.compressionRatio * 100)}% of the way between the safe minimum and our ideal spacing.
          Every gap still meets the medical minimum.
        </WarningBanner>
      )}
      {unplaced.length > 0 && (
        <WarningBanner tone="danger" title="Some treatments no longer fit safely">
          {schedule.warnings.find((w) => w.startsWith("Your wedding is too close")) ?? "After the latest change, a few sessions can't be placed without breaking a rest period."}
          {schedule.suggestions && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4">
              {schedule.suggestions.map((x) => <li key={x}>{x}</li>)}
            </ul>
          )}
        </WarningBanner>
      )}
      {shifted > 0 && (
        <WarningBanner tone="info" title={`${shifted} session${shifted > 1 ? "s were" : " was"} moved to fit the clinic's calendar`}>
          Open a card marked “Moved” to see why. All rest periods were re-checked.
        </WarningBanner>
      )}
      {!validation.valid && (
        <WarningBanner tone="danger" title="Safety check found issues">
          <ul className="list-disc pl-4">{validation.violations.map((v) => <li key={v}>{v}</li>)}</ul>
        </WarningBanner>
      )}
      {schedule.warnings.filter((w) => w.startsWith("No safe alternative")).map((w) => (
        <WarningBanner key={w} title="Needs a call from the clinic">{w}</WarningBanner>
      ))}

      {sessions.length === 0 ? (
        <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">No sessions could be placed before the wedding.</div>
      ) : (
        <ol className="space-y-0" aria-label="Treatment timeline">
          {sessions.map((x, i) => {
            const prev = sessions[i - 1];
            const label = prev
              ? x.gapFromPreviousDays && x.status !== "missed" && prev.treatmentId === x.treatmentId
                ? restLabel(x.treatmentId, x.gapFromPreviousDays)
                : (() => {
                    const d = daysBetween(prev.date, x.date);
                    return d === 0 ? "Same day" : `${d} day${d > 1 ? "s" : ""} later${x.gapFromPreviousDays ? ` · ${x.gapFromPreviousDays} days since last ${getTreatment(x.treatmentId).name}` : ""}`;
                  })()
              : null;
            const hl = changed.has(x.id);
            return (
              <Fragment key={x.id}>
                {label && <RestConnector label={label} />}
                <TimelineItem
                  key={hl ? `${x.id}-${s.changeStamp}` : x.id}
                  session={x}
                  today={s.today}
                  isNext={x.id === nextId}
                  highlight={hl}
                  onReschedule={() => setEditing(x)}
                  canComplete={s.role === "clinic"}
                  onComplete={() => {
                    s.markCompleted(x.id);
                    toast.success(`${getTreatment(x.treatmentId).name} marked completed.`);
                  }}
                  onMissed={() => {
                    const out = s.reschedule(x.id, "missed");
                    if (!out.ok) toast.error(out.message);
                    else if (out.unplaced.length) toast.error(out.unplaced[0].reason);
                    else toast.success(`Rebooked. ${out.changedIds.length} session(s) updated.`);
                  }}
                />
              </Fragment>
            );
          })}
        </ol>
      )}

      {unplaced.length > 0 && (
        <section className="rounded-2xl border border-destructive/20 bg-card p-5">
          <h2 className="text-xl font-semibold">Unplaced treatments</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {unplaced.map((u, i) => (
              <li key={u.treatmentId + i} className="rounded-xl bg-destructive/5 p-3">
                <p className="font-semibold">{u.count} × {getTreatment(u.treatmentId).name}</p>
                <p className="text-muted-foreground">{u.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RestConnector label="The final stretch" />
      <section className="rounded-3xl bg-hero p-6 text-center text-primary-foreground shadow-soft">
        <Heart className="mx-auto h-8 w-8 text-gold" aria-hidden />
        <h2 className="mt-2 font-display text-2xl font-semibold">Wedding Day</h2>
        <p className="mt-1 text-sm opacity-90">{longDay(s.weddingDate)}</p>
        <p className="mt-2 text-sm opacity-90">Glowing, rested and ready. We can't wait to see you shine.</p>
      </section>

      <RescheduleSheet session={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
