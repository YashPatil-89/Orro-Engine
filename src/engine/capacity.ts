// =============================================================================
// Capacity balancer.
//
// The ideal plan may land on a day when the clinic is closed or fully booked.
// We walk the plan from the wedding backwards; for each session that cannot
// stay put we try the nearest days: same day, 1 earlier, 1 later, 2 earlier,
// 2 later ... (earlier preferred). A day is acceptable only if it is open, has
// a free slot, is not before tomorrow, not past the treatment's latest-before-
// wedding limit, keeps the rest gap to the next session of the same treatment,
// and keeps 5 days between different intensive treatments.
//
// Moving a session earlier can squeeze the rest gap to its previous session.
// When that happens we push the previous session earlier too (re-propagation),
// and so on down the chain, as long as nothing lands before tomorrow.
// =============================================================================
import { existingAppointments, allSlots } from "@/data/clinic";
import { getTreatment } from "@/data/treatments";
import type { CapacityMap, ClinicConfig, Session } from "@/types";
import { daysBetween, isSunday, prettyDay, shiftDay } from "./dates";
import { CROSS_INTENSIVE_GAP, sortSessions } from "./schedule";

export interface CapacityContext {
  weddingDate: string;
  today: string;
}

export interface CapacityResult {
  sessions: Session[];
  warnings: string[];
}

export function dayStatus(date: string, map: CapacityMap, config: ClinicConfig) {
  const e = map[date];
  return {
    booked: e?.booked ?? 0,
    max: e?.max ?? config.maxAppointmentsPerDay,
    closed: !!e?.closed || (config.sundayClosed && isSunday(date)),
  };
}

type Problem = "closed" | "full" | "cross" | "gap" | "bound" | "past";

const REASONS: Record<Problem, string> = {
  closed: "the clinic is closed that day",
  full: "the clinic was fully booked",
  cross: "two intensive treatments need at least 5 days between them",
  gap: "it keeps a safe rest period between sessions",
  bound: "it was too close to the wedding",
  past: "that date has already passed",
};

export function applyCapacity(
  input: Session[],
  capacityMap: CapacityMap,
  config: ClinicConfig,
  ctx: CapacityContext,
): CapacityResult {
  const sessions = input.map((s) => ({ ...s }));
  const tomorrow = shiftDay(ctx.today, 1);
  const warnings: string[] = [];
  const committed = new Set<string>();
  const load = new Map<string, number>();
  const addLoad = (d: string) => load.set(d, (load.get(d) ?? 0) + 1);

  // Completed and missed sessions never move.
  for (const s of sessions) {
    if (s.status !== "upcoming") {
      committed.add(s.id);
      if (s.status === "completed") addLoad(s.date);
    }
  }

  /** Active (non-missed) sessions of a treatment in order. */
  const chain = (tid: string) =>
    sessions.filter((x) => x.treatmentId === tid && x.status !== "missed").sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  /** Can the earlier part of the chain be pushed back so `s` can sit on `d`? */
  const cascadeFits = (s: Session, d: string): boolean => {
    const c = chain(s.treatmentId);
    const t = getTreatment(s.treatmentId);
    let cursor = d;
    for (let i = c.findIndex((x) => x.id === s.id) - 1; i >= 0; i--) {
      const prev = c[i];
      const limit = shiftDay(cursor, -t.minGapDays);
      if (prev.date <= limit) return true;
      if (prev.status !== "upcoming" || committed.has(prev.id)) return false;
      if (limit < tomorrow) return false;
      cursor = limit;
    }
    return true;
  };

  /** Why `s` cannot sit on `d`, or null if it can. */
  const problemAt = (s: Session, d: string): Problem | null => {
    const t = getTreatment(s.treatmentId);
    if (d < tomorrow) return "past";
    if (d > shiftDay(ctx.weddingDate, -t.latestBeforeWeddingDays)) return "bound";
    const ds = dayStatus(d, capacityMap, config);
    if (ds.closed) return "closed";
    if (ds.booked + (load.get(d) ?? 0) >= ds.max) return "full";
    const c = chain(s.treatmentId);
    const idx = c.findIndex((x) => x.id === s.id);
    const next = c[idx + 1];
    if (next && daysBetween(d, next.date) < t.minGapDays) return "gap";
    if (!cascadeFits(s, d)) return "gap";
    if (t.category === "intensive") {
      const clash = sessions.some(
        (o) =>
          committed.has(o.id) &&
          o.status !== "missed" &&
          o.treatmentId !== s.treatmentId &&
          getTreatment(o.treatmentId).category === "intensive" &&
          Math.abs(daysBetween(o.date, d)) < CROSS_INTENSIVE_GAP,
      );
      if (clash) return "cross";
    }
    return null;
  };

  const moveTo = (s: Session, d: string, reason: string) => {
    if (s.date === d) return;
    if (!s.shifted) s.originalDate = s.date;
    s.shifted = true;
    s.shiftReason = `Moved from ${prettyDay(s.originalDate!)} because ${reason}.`;
    s.date = d;
    if (s.originalDate === d) {
      s.shifted = false;
      s.originalDate = undefined;
      s.shiftReason = undefined;
    }
  };

  for (let iter = 0; iter < 200; iter++) {
    const open = sessions.filter((s) => !committed.has(s.id));
    if (!open.length) break;
    // Latest first: sessions nearest the wedding are the most constrained.
    open.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.sequenceNumber - a.sequenceNumber));
    const s = open[0];
    const t = getTreatment(s.treatmentId);
    const problem = problemAt(s, s.date);

    if (problem) {
      let found: string | null = null;
      for (let k = 1; k <= 60 && !found; k++) {
        for (const d of [shiftDay(s.date, -k), shiftDay(s.date, k)]) {
          if (!problemAt(s, d)) {
            found = d;
            break;
          }
        }
      }
      if (found) {
        moveTo(s, found, REASONS[problem]);
      } else {
        warnings.push(
          `No safe alternative date was found for ${t.name} (session ${s.sequenceNumber}) on ${prettyDay(s.date)}. Please call the clinic to arrange it manually.`,
        );
      }
    }

    committed.add(s.id);
    addLoad(s.date);

    // Re-propagate: push earlier sessions of this treatment back if their rest gap shrank.
    const c = chain(s.treatmentId);
    for (let i = c.findIndex((x) => x.id === s.id) - 1; i >= 0; i--) {
      const later = c[i + 1];
      const prev = c[i];
      const limit = shiftDay(later.date, -t.minGapDays);
      if (prev.date <= limit || committed.has(prev.id)) break;
      moveTo(prev, limit, `it keeps a safe ${t.minGapDays}-day rest before your next ${t.name}`);
    }
  }

  return { sessions: finalize(sessions, capacityMap, config), warnings };
}

/** Recompute rest gaps and assign the next free clinic slot on each day. */
export function finalize(sessions: Session[], capacityMap: CapacityMap, config: ClinicConfig): Session[] {
  const out = sessions.map((s) => ({ ...s }));
  for (const tid of new Set(out.map((s) => s.treatmentId))) {
    const c = out.filter((s) => s.treatmentId === tid && s.status !== "missed").sort((a, b) => (a.date < b.date ? -1 : 1));
    c.forEach((s, i) => (s.gapFromPreviousDays = i === 0 ? null : daysBetween(c[i - 1].date, s.date)));
  }
  const slots = allSlots(config);
  const byDay = new Map<string, Session[]>();
  for (const s of out) if (s.status !== "missed") byDay.set(s.date, [...(byDay.get(s.date) ?? []), s]);
  for (const [day, list] of byDay) {
    const taken = new Set(existingAppointments(day, dayStatus(day, capacityMap, config).booked, config).map((a) => a.time));
    const free = slots.filter((x) => !taken.has(x));
    list
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .forEach((s, i) => {
        if (s.status === "upcoming") s.time = free[i] ?? slots[slots.length - 1];
      });
  }
  return sortSessions(out);
}
