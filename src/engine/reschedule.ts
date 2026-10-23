// =============================================================================
// Disruption handling.
//
// Life happens: a bride misses an appointment or needs to move one. The
// wedding still cannot move, so we rebuild only what is affected:
//  - Moving to a specific date: the date must keep the rest gap to the previous
//    session and leave room for the remaining sessions before the wedding
//    limit. Otherwise we refuse and suggest the nearest date that works.
//  - Missed: the missed visit is kept as a record, and that session plus all
//    later sessions of the same treatment are re-spaced between the earliest
//    safe day and the latest allowed day, shrinking gaps toward the minimum if
//    needed. Anything that still cannot fit is reported as unplaced.
// Finally the capacity balancer runs again so clinic limits and the
// intensive-treatment rule hold for the whole plan.
// =============================================================================
import { getTreatment } from "@/data/treatments";
import type { CapacityMap, ClinicConfig, Session, Unplaced } from "@/types";
import { applyCapacity, dayStatus } from "./capacity";
import { daysBetween, prettyDay, shiftDay } from "./dates";
import { sortSessions } from "./schedule";

export interface PlanState {
  weddingDate: string;
  today: string;
  sessions: Session[];
  capacityMap: CapacityMap;
  config: ClinicConfig;
}

export type RescheduleOutcome =
  | { ok: true; sessions: Session[]; changedIds: string[]; warnings: string[]; unplaced: Unplaced[] }
  | { ok: false; message: string; suggestedDate?: string };

const activeChain = (sessions: Session[], tid: string) =>
  sessions.filter((s) => s.treatmentId === tid && s.status !== "missed").sort((a, b) => a.sequenceNumber - b.sequenceNumber);

/** Explain why a session cannot be moved to `date`, or return null if it can. */
export function explainDate(state: PlanState, sessionId: string, date: string): string | null {
  const s = state.sessions.find((x) => x.id === sessionId);
  if (!s) return "Session not found.";
  const t = getTreatment(s.treatmentId);
  const tomorrow = shiftDay(state.today, 1);
  const bound = shiftDay(state.weddingDate, -t.latestBeforeWeddingDays);
  if (date < tomorrow) return "Sessions can only be booked from tomorrow onward.";
  if (date > bound) return `${t.name} must be at least ${t.latestBeforeWeddingDays} days before the wedding.`;
  const ds = dayStatus(date, state.capacityMap, state.config);
  if (ds.closed) return "The clinic is closed that day.";
  const others = state.sessions.filter((x) => x.date === date && x.status === "upcoming" && x.id !== s.id).length;
  if (ds.booked + others >= ds.max) return "The clinic is fully booked that day.";
  const c = activeChain(state.sessions, s.treatmentId);
  const idx = c.findIndex((x) => x.id === s.id);
  const prev = c[idx - 1];
  if (prev && daysBetween(prev.date, date) < t.minGapDays)
    return `Needs ${t.minGapDays} rest days after your previous ${t.name} on ${prettyDay(prev.date)}.`;
  const remaining = c.length - idx - 1;
  if (daysBetween(date, bound) < remaining * t.minGapDays)
    return `Too late: the ${remaining} remaining ${t.name} session${remaining > 1 ? "s" : ""} would no longer fit before the wedding.`;
  return null;
}

/** Nearest valid date to `date` (earlier preferred), searching ±60 days. */
export function nearestValidDate(state: PlanState, sessionId: string, date: string): string | undefined {
  for (let k = 0; k <= 60; k++)
    for (const d of k === 0 ? [date] : [shiftDay(date, -k), shiftDay(date, k)])
      if (!explainDate(state, sessionId, d)) return d;
  return undefined;
}

/**
 * Re-space `list` (in order) between `floor` and `bound`, keeping the last one
 * as close as possible to its current date. Returns the dates that fit and the
 * number of earliest sessions that had to be dropped.
 */
function respace(list: Session[], floor: string, bound: string, minGap: number, prefGap: number) {
  const k = list.length;
  const span = daysBetween(floor, bound);
  if (span < 0) return { dates: [] as string[], dropped: k };
  const fit = Math.min(k, minGap === 0 ? k : Math.floor(span / minGap) + 1);
  if (fit === 1) return { dates: [floor], dropped: k - 1 };
  // Anchor: keep the last session where it was if possible, else at the bound.
  const lastCurrent = list[k - 1].date;
  let anchor = lastCurrent <= bound ? lastCurrent : bound;
  if (daysBetween(floor, anchor) < (fit - 1) * minGap) anchor = bound;
  const gap = Math.max(minGap, Math.min(prefGap, Math.floor(daysBetween(floor, anchor) / (fit - 1))));
  const dates = Array.from({ length: fit }, (_, i) => shiftDay(anchor, -(fit - 1 - i) * gap));
  return { dates, dropped: k - fit };
}

export function rescheduleFrom(state: PlanState, sessionId: string, target: string | "missed"): RescheduleOutcome {
  const before = new Map(state.sessions.map((s) => [s.id, `${s.date} ${s.time}`]));
  let sessions = state.sessions.map((s) => ({ ...s }));
  const s = sessions.find((x) => x.id === sessionId);
  if (!s) return { ok: false, message: "That session could not be found." };
  if (s.status !== "upcoming") return { ok: false, message: "Only upcoming sessions can be changed." };

  const t = getTreatment(s.treatmentId);
  const tomorrow = shiftDay(state.today, 1);
  const bound = shiftDay(state.weddingDate, -t.latestBeforeWeddingDays);
  const chain = activeChain(sessions, s.treatmentId);
  const idx = chain.findIndex((x) => x.id === s.id);
  const prev = chain[idx - 1];
  const downstream = chain.slice(idx + 1).filter((x) => x.status === "upcoming");
  const unplaced: Unplaced[] = [];
  const warnings: string[] = [];

  if (target !== "missed") {
    const problem = explainDate(state, sessionId, target);
    if (problem) {
      const suggestedDate = nearestValidDate(state, sessionId, target);
      return {
        ok: false,
        message: suggestedDate ? `${problem} The nearest date that works is ${prettyDay(suggestedDate)}.` : `${problem} No safe alternative date was found.`,
        suggestedDate,
      };
    }
    const from = s.date;
    s.date = target;
    s.originalDate = s.originalDate ?? from;
    s.shifted = true;
    s.shiftReason = `Rescheduled from ${prettyDay(from)} at your request.`;
    // Push later sessions of the same treatment if their rest gap is now too short.
    let cursor = target;
    const needsRespace = downstream.some((d, i) => daysBetween(i === 0 ? cursor : downstream[i - 1].date, d.date) < t.minGapDays);
    if (needsRespace) {
      cursor = shiftDay(target, t.minGapDays);
      const { dates } = respace(downstream, cursor, bound, t.minGapDays, t.preferredGapDays);
      downstream.forEach((d, i) => {
        if (dates[i] && dates[i] !== d.date) {
          d.originalDate = d.originalDate ?? d.date;
          d.shifted = true;
          d.shiftReason = `Moved from ${prettyDay(d.date)} to keep a safe rest after your rescheduled ${t.name}.`;
          d.date = dates[i];
        }
      });
    }
  } else {
    // Keep a record of the missed visit, then rebuild this session and everything after it.
    const missedCount = sessions.filter((x) => x.id.startsWith(`${s.id}-missed`)).length;
    sessions.push({ ...s, id: `${s.id}-missed-${missedCount + 1}`, status: "missed", shifted: false, shiftReason: undefined });
    const floor = prev ? (shiftDay(prev.date, t.minGapDays) > tomorrow ? shiftDay(prev.date, t.minGapDays) : tomorrow) : tomorrow;
    const list = [s, ...downstream];
    const { dates, dropped } = respace(list, floor, bound, t.minGapDays, t.preferredGapDays);
    // Keep the latest sessions; drop the earliest ones that no longer fit.
    const keep = list.slice(dropped);
    const lost = list.slice(0, dropped);
    keep.forEach((d, i) => {
      if (dates[i] !== d.date) {
        d.originalDate = d.originalDate ?? d.date;
        d.shifted = true;
        d.shiftReason =
          d.id === s.id
            ? `Rebooked after the missed visit on ${prettyDay(d.originalDate)}.`
            : `Moved from ${prettyDay(d.date)} to keep safe rest after the rebooked ${t.name}.`;
        d.date = dates[i];
      }
    });
    if (lost.length) {
      const daysLeft = Math.max(0, daysBetween(floor, bound));
      unplaced.push({
        treatmentId: t.id,
        count: lost.length,
        reason: `${lost.length} ${lost.length > 1 ? t.plural : t.name + " session"} no longer fit${lost.length > 1 ? "" : "s"}: after the missed visit only ${daysLeft} days remain before the last allowed date (${t.latestBeforeWeddingDays} days before the wedding), and sessions need ${t.minGapDays} days between them.`,
      });
      const lostIds = new Set(lost.map((x) => x.id));
      sessions = sessions.filter((x) => !lostIds.has(x.id));
    }
    // Renumber the remaining active chain.
    const fresh = activeChain(sessions, t.id).sort((a, b) => (a.date < b.date ? -1 : 1));
    fresh.forEach((x, i) => {
      x.sequenceNumber = i + 1;
      x.totalOfThisTreatment = fresh.length;
    });
  }

  const balanced = applyCapacity(sessions, state.capacityMap, state.config, { weddingDate: state.weddingDate, today: state.today });
  warnings.push(...balanced.warnings);
  const changedIds = balanced.sessions.filter((x) => before.get(x.id) !== `${x.date} ${x.time}`).map((x) => x.id);
  return { ok: true, sessions: sortSessions(balanced.sessions), changedIds, warnings, unplaced };
}
