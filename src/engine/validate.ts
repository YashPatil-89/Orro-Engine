// =============================================================================
// Safety check. Re-reads a finished schedule and lists every rule it breaks.
// The UI shows "All rest periods safe" only when this returns no violations.
// =============================================================================
import { getTreatment } from "@/data/treatments";
import type { CapacityMap, ClinicConfig, Session } from "@/types";
import { daysBetween, prettyDay, shiftDay } from "./dates";
import { dayStatus } from "./capacity";
import { CROSS_INTENSIVE_GAP } from "./schedule";

export interface ValidateOptions {
  today?: string;
  capacityMap?: CapacityMap;
  config?: ClinicConfig;
}

export function validateSchedule(sessions: Session[], weddingDate: string, opts: ValidateOptions = {}) {
  const violations: string[] = [];
  const active = sessions.filter((s) => s.status !== "missed");

  // 1. Same-treatment rest gaps.
  for (const tid of new Set(active.map((s) => s.treatmentId))) {
    const t = getTreatment(tid);
    const c = active.filter((s) => s.treatmentId === tid).sort((a, b) => (a.date < b.date ? -1 : 1));
    for (let i = 1; i < c.length; i++) {
      const gap = daysBetween(c[i - 1].date, c[i].date);
      if (gap < t.minGapDays)
        violations.push(`${t.name}: only ${gap} days between ${prettyDay(c[i - 1].date)} and ${prettyDay(c[i].date)} (minimum ${t.minGapDays}).`);
    }
  }

  for (const s of active) {
    const t = getTreatment(s.treatmentId);
    // 2. Latest-before-wedding limit.
    if (s.date > shiftDay(weddingDate, -t.latestBeforeWeddingDays))
      violations.push(`${t.name} on ${prettyDay(s.date)} is closer than ${t.latestBeforeWeddingDays} days to the wedding.`);
    // 4. Nothing upcoming in the past.
    if (opts.today && s.status === "upcoming" && s.date <= opts.today)
      violations.push(`${t.name} on ${prettyDay(s.date)} is in the past but not marked completed or missed.`);
  }

  // 3. Different intensive treatments 5+ days apart.
  const intensive = active.filter((s) => getTreatment(s.treatmentId).category === "intensive");
  for (let i = 0; i < intensive.length; i++)
    for (let j = i + 1; j < intensive.length; j++) {
      const a = intensive[i];
      const b = intensive[j];
      if (a.treatmentId === b.treatmentId) continue;
      const gap = Math.abs(daysBetween(a.date, b.date));
      if (gap < CROSS_INTENSIVE_GAP)
        violations.push(
          `${getTreatment(a.treatmentId).name} and ${getTreatment(b.treatmentId).name} are only ${gap} days apart (intensive treatments need ${CROSS_INTENSIVE_GAP}).`,
        );
    }

  // 5. Capacity.
  if (opts.capacityMap && opts.config) {
    const perDay = new Map<string, number>();
    for (const s of active) if (s.status === "upcoming") perDay.set(s.date, (perDay.get(s.date) ?? 0) + 1);
    for (const [day, n] of perDay) {
      const ds = dayStatus(day, opts.capacityMap, opts.config);
      if (ds.closed) violations.push(`The clinic is closed on ${prettyDay(day)}.`);
      else if (ds.booked + n > ds.max) violations.push(`${prettyDay(day)} is over capacity (${ds.booked + n}/${ds.max}).`);
    }
  }

  return { valid: violations.length === 0, violations };
}
