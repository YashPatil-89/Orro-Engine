// =============================================================================
// Backward scheduling engine.
//
// The wedding date never moves. We start at the wedding (T-0) and walk
// BACKWARDS: each treatment's final session is pinned to the latest safe day
// before the wedding, and earlier sessions are spaced out behind it by that
// treatment's rest gap. If the plan would need to start before tomorrow we
// shrink the gaps uniformly (never below the medical minimum). If even the
// minimum gaps do not fit, we keep the sessions closest to the wedding and
// report the rest as "unplaced" with a plain-English reason.
// =============================================================================
import { FINAL_GLOW_ID, getTreatment } from "@/data/treatments";
import type { CapacityMap, PlanRequest, ScheduleResult, Session, Unplaced } from "@/types";
import { daysBetween, shiftDay } from "./dates";

/** Two intensive sessions of different treatments must be this many days apart. */
export const CROSS_INTENSIVE_GAP = 5;

/** A session before it becomes a full Session object. */
export interface Draft {
  treatmentId: string;
  seq: number; // 1 = first session of this treatment
  date: string;
  gap: number; // rest days required after the previous session of this treatment
}

/** Clean up requests: drop zero counts, merge duplicates, Final Glow is always 1. */
export function normalizeRequests(requests: PlanRequest[]): PlanRequest[] {
  const merged = new Map<string, number>();
  for (const r of requests) {
    if (!r || r.count <= 0) continue;
    const t = getTreatment(r.treatmentId);
    const count = t.singleSession ? 1 : Math.min(12, Math.floor(r.count));
    merged.set(r.treatmentId, Math.max(merged.get(r.treatmentId) ?? 0, count));
  }
  return [...merged.entries()].map(([treatmentId, count]) => ({ treatmentId, count }));
}

/** The gap used for a treatment at compression ratio r (1 = preferred, 0 = minimum). */
export function gapAt(treatmentId: string, r: number): number {
  const t = getTreatment(treatmentId);
  return Math.round(t.minGapDays + r * (t.preferredGapDays - t.minGapDays));
}

/** Step 2: pin the last session to (wedding - latestBeforeWedding) and walk back by `gap`. */
function planDates(requests: PlanRequest[], weddingDate: string, r: number): Draft[] {
  const drafts: Draft[] = [];
  for (const req of requests) {
    const t = getTreatment(req.treatmentId);
    const last = shiftDay(weddingDate, -t.latestBeforeWeddingDays);
    const gap = gapAt(t.id, r);
    for (let k = 0; k < req.count; k++) {
      drafts.push({ treatmentId: t.id, seq: req.count - k, date: shiftDay(last, -k * gap), gap });
    }
  }
  return drafts;
}

/**
 * Step 5: cross-treatment safety. Intensive sessions of different treatments
 * must be 5+ days apart. We fix the latest sessions first (they are pinned
 * to the wedding) and push any conflicting earlier session further back. A
 * pushed session drags the earlier sessions of its own treatment with it so
 * their rest gaps stay intact.
 *
 * If `floor` is given, any session that would land before it is dropped,
 * together with all earlier sessions of that treatment.
 */
export function resolveCross(drafts: Draft[], floor?: string): { placed: Draft[]; dropped: Draft[] } {
  const pending = drafts.map((d) => ({ ...d }));
  const placed: Draft[] = [];
  const dropped: Draft[] = [];
  const deadChains = new Set<string>();

  while (pending.length) {
    // Constrain each pending draft by the already placed later session of its treatment.
    for (const d of pending) {
      const next = placed.find((p) => p.treatmentId === d.treatmentId && p.seq === d.seq + 1);
      if (next) {
        const limit = shiftDay(next.date, -next.gap);
        if (d.date > limit) d.date = limit;
      }
    }
    pending.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.seq - a.seq));
    const d = pending.shift()!;
    if (deadChains.has(d.treatmentId)) {
      dropped.push(d);
      continue;
    }
    if (getTreatment(d.treatmentId).category === "intensive") {
      // Keep moving earlier until no other intensive treatment is within 5 days.
      for (let guard = 0; guard < 100; guard++) {
        const clash = placed.find(
          (p) =>
            p.treatmentId !== d.treatmentId &&
            getTreatment(p.treatmentId).category === "intensive" &&
            Math.abs(daysBetween(p.date, d.date)) < CROSS_INTENSIVE_GAP,
        );
        if (!clash) break;
        d.date = shiftDay(clash.date, -CROSS_INTENSIVE_GAP);
      }
    }
    if (floor && d.date < floor) {
      deadChains.add(d.treatmentId);
      dropped.push(d);
      continue;
    }
    placed.push(d);
  }
  return { placed, dropped };
}

/** Days of lead time a plan needs (today must be at least this many days before the wedding). */
export function leadTimeDays(requests: PlanRequest[], r: number): number {
  const reqs = normalizeRequests(requests);
  if (!reqs.length) return 0;
  const wedding = "2040-06-15";
  const { placed } = resolveCross(planDates(reqs, wedding, r));
  const earliest = placed.reduce((m, d) => (d.date < m ? d.date : m), wedding);
  return daysBetween(earliest, wedding) + 1;
}

export function estimateLeadTime(requests: PlanRequest[]) {
  return { minimum: leadTimeDays(requests, 0), comfortable: leadTimeDays(requests, 1) };
}

/** Turn drafts into Session objects: renumber, compute gaps, sort chronologically. */
export function draftsToSessions(drafts: Draft[], today: string): Session[] {
  const byTreatment = new Map<string, Draft[]>();
  for (const d of drafts) byTreatment.set(d.treatmentId, [...(byTreatment.get(d.treatmentId) ?? []), d]);
  const sessions: Session[] = [];
  for (const [tid, list] of byTreatment) {
    list.sort((a, b) => (a.date < b.date ? -1 : 1));
    list.forEach((d, i) => {
      sessions.push({
        id: `${tid}-${i + 1}`,
        treatmentId: tid,
        date: d.date,
        time: "10:00",
        sequenceNumber: i + 1,
        totalOfThisTreatment: list.length,
        gapFromPreviousDays: i === 0 ? null : daysBetween(list[i - 1].date, d.date),
        status: d.date <= today ? "completed" : "upcoming",
      });
    });
  }
  return sortSessions(sessions);
}

export function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.time !== b.time ? (a.time < b.time ? -1 : 1) : a.id < b.id ? -1 : 1,
  );
}

export interface GenerateInput {
  weddingDate: string;
  requests: PlanRequest[];
  today: string;
  capacityMap?: CapacityMap; // capacity is applied separately by applyCapacity()
}

export function generateSchedule({ weddingDate, requests, today }: GenerateInput): ScheduleResult {
  const reqs = normalizeRequests(requests);
  const earliest = shiftDay(today, 1); // Step 1: nothing can be booked today or earlier.
  const empty: ScheduleResult = { status: "infeasible", sessions: [], warnings: [], unplaced: [], compressionRatio: 0 };

  if (!reqs.length) return { ...empty, warnings: ["Choose at least one treatment to build a countdown."] };
  if (weddingDate <= today) return { ...empty, warnings: ["The wedding date must be in the future."] };

  // Step 3: try the comfortable plan first, then shrink all gaps together
  // in 5% steps until everything fits after tomorrow.
  for (let step = 20; step >= 0; step--) {
    const r = step / 20;
    const { placed } = resolveCross(planDates(reqs, weddingDate, r));
    if (placed.every((d) => d.date >= earliest)) {
      const warnings =
        r < 1
          ? ["Gaps between sessions were shortened to fit your timeline. All rest periods remain at or above the safe minimum."]
          : [];
      return {
        status: r === 1 ? "comfortable" : "compressed",
        sessions: draftsToSessions(placed, today),
        warnings,
        unplaced: [],
        compressionRatio: r,
      };
    }
  }

  // Step 4: even minimum gaps do not fit. Keep the latest sessions, drop the earliest.
  const { placed, dropped } = resolveCross(planDates(reqs, weddingDate, 0), earliest);
  const unplaced: Unplaced[] = [];
  const suggestions: string[] = [];
  const daysLeft = daysBetween(today, weddingDate);
  for (const req of reqs) {
    const lost = dropped.filter((d) => d.treatmentId === req.treatmentId).length;
    if (!lost) continue;
    const t = getTreatment(req.treatmentId);
    const kept = req.count - lost;
    let reason: string;
    if (t.id === FINAL_GLOW_ID) {
      reason = `The Final Glow Facial must be exactly 2 days before the wedding, and that day has already passed.`;
    } else if (kept === 0) {
      reason = `No ${t.plural} fit: the last session must be at least ${t.latestBeforeWeddingDays} days before the wedding, and only ${daysLeft} days remain.`;
    } else {
      reason = `Only ${kept} of ${req.count} ${t.plural} fit: the last session must be at least ${t.latestBeforeWeddingDays} days before the wedding and sessions need ${t.minGapDays} days between them.`;
    }
    unplaced.push({ treatmentId: t.id, count: lost, reason });
    suggestions.push(kept === 0 ? `Remove ${t.name} from this plan.` : `Reduce ${t.name} to ${kept} session${kept > 1 ? "s" : ""}.`);
  }
  const lead = estimateLeadTime(reqs);
  suggestions.push(
    `The full plan needs at least ${lead.minimum} days of lead time (${lead.comfortable} days for comfortable pacing). Your wedding is ${daysLeft} days away.`,
  );
  const placedCount = placed.length;
  const total = reqs.reduce((s, r) => s + r.count, 0);
  return {
    status: "infeasible",
    sessions: draftsToSessions(placed, today),
    warnings: [
      `Your wedding is too close to fit every session safely. We scheduled ${placedCount} of ${total} sessions, all with safe rest periods.`,
    ],
    unplaced,
    compressionRatio: 0,
    suggestions,
  };
}
