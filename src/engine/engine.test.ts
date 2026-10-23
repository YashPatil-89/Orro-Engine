import { describe, expect, it } from "vitest";
import { PACKAGES } from "@/data/packages";
import { DEFAULT_CLINIC } from "@/data/clinic";
import { getTreatment } from "@/data/treatments";
import type { CapacityMap, Session } from "@/types";
import {
  applyCapacity,
  daysBetween,
  generateSchedule,
  parseConsultationNote,
  rescheduleFrom,
  sessionsToIcs,
  shiftDay,
  validateSchedule,
} from "./index";

const TODAY = "2026-03-02"; // a Monday
const pkg = (id: string) => PACKAGES.find((p) => p.id === id)!.requests;
const openConfig = { ...DEFAULT_CLINIC, sundayClosed: false };

function gapsOk(sessions: Session[]) {
  const byT = new Map<string, Session[]>();
  for (const s of sessions.filter((x) => x.status !== "missed")) byT.set(s.treatmentId, [...(byT.get(s.treatmentId) ?? []), s]);
  for (const [tid, list] of byT) {
    list.sort((a, b) => (a.date < b.date ? -1 : 1));
    for (let i = 1; i < list.length; i++)
      expect(daysBetween(list[i - 1].date, list[i].date)).toBeGreaterThanOrEqual(getTreatment(tid).minGapDays);
  }
}

describe("generateSchedule", () => {
  it("90 days out is comfortable with preferred gaps", () => {
    const wedding = shiftDay(TODAY, 90);
    const r = generateSchedule({ weddingDate: wedding, requests: pkg("radiance"), today: TODAY });
    expect(r.status).toBe("comfortable");
    expect(r.compressionRatio).toBe(1);
    const acne = r.sessions.filter((s) => s.treatmentId === "acne-peel");
    expect(acne).toHaveLength(3);
    expect(acne[2].date).toBe(shiftDay(wedding, -14));
    expect(acne.slice(1).every((s) => s.gapFromPreviousDays === 14)).toBe(true);
    const glow = r.sessions.find((s) => s.treatmentId === "final-glow-facial")!;
    expect(glow.date).toBe(shiftDay(wedding, -2));
    expect(validateSchedule(r.sessions, wedding, { today: TODAY }).valid).toBe(true);
  });

  it("38 days out with Radiance Bride compresses but keeps minimum gaps", () => {
    const wedding = shiftDay(TODAY, 38);
    const r = generateSchedule({ weddingDate: wedding, requests: pkg("radiance"), today: TODAY });
    expect(r.status).toBe("compressed");
    expect(r.compressionRatio).toBeGreaterThan(0);
    expect(r.compressionRatio).toBeLessThan(1);
    expect(r.sessions.every((s) => s.date > TODAY)).toBe(true);
    gapsOk(r.sessions);
    expect(validateSchedule(r.sessions, wedding, { today: TODAY }).valid).toBe(true);
  });

  it("7 days out with the full package is infeasible and lists unplaced sessions", () => {
    const wedding = shiftDay(TODAY, 7);
    const r = generateSchedule({ weddingDate: wedding, requests: pkg("complete"), today: TODAY });
    expect(r.status).toBe("infeasible");
    const ids = r.unplaced.map((u) => u.treatmentId);
    expect(ids).toContain("laser-hair-therapy");
    expect(ids).toContain("deep-skin-peel");
    expect(r.unplaced.find((u) => u.treatmentId === "laser-hair-therapy")!.count).toBe(3);
    expect(r.suggestions!.some((s) => s.includes("days of lead time"))).toBe(true);
    // Gentle treatments near the wedding still fit.
    expect(r.sessions.some((s) => s.treatmentId === "final-glow-facial")).toBe(true);
    gapsOk(r.sessions);
  });

  it("keeps different intensive treatments at least 5 days apart", () => {
    const wedding = shiftDay(TODAY, 100);
    const r = generateSchedule({
      weddingDate: wedding,
      requests: [
        { treatmentId: "acne-peel", count: 2 },
        { treatmentId: "deep-skin-peel", count: 2 },
      ],
      today: TODAY,
    });
    expect(validateSchedule(r.sessions, wedding).valid).toBe(true);
  });

  it("rejects past wedding dates and empty plans", () => {
    expect(generateSchedule({ weddingDate: TODAY, requests: pkg("classic"), today: TODAY }).sessions).toHaveLength(0);
    expect(generateSchedule({ weddingDate: shiftDay(TODAY, 60), requests: [], today: TODAY }).sessions).toHaveLength(0);
  });
});

describe("applyCapacity", () => {
  it("shifts a session off a fully booked day and re-propagates the earlier one", () => {
    const wedding = shiftDay(TODAY, 60);
    const r = generateSchedule({ weddingDate: wedding, requests: [{ treatmentId: "acne-peel", count: 2 }], today: TODAY });
    const [first, last] = r.sessions;
    expect(daysBetween(first.date, last.date)).toBe(14);
    // Block the last day and the four days before it so the peel must move 5 days earlier.
    const map: CapacityMap = {};
    for (let k = 0; k <= 4; k++) map[shiftDay(last.date, -k)] = { booked: 6, max: 6, closed: false };
    const out = applyCapacity(r.sessions, map, openConfig, { weddingDate: wedding, today: TODAY });
    const newLast = out.sessions.find((s) => s.id === last.id)!;
    const newFirst = out.sessions.find((s) => s.id === first.id)!;
    expect(newLast.shifted).toBe(true);
    expect(newLast.date).toBe(shiftDay(last.date, -5));
    expect(newLast.shiftReason).toContain("fully booked");
    // Gap was 14, now 9 < 10 minimum → first peel pushed back to keep 10 days.
    expect(daysBetween(newFirst.date, newLast.date)).toBe(10);
    expect(newFirst.shifted).toBe(true);
    expect(validateSchedule(out.sessions, wedding, { capacityMap: map, config: openConfig }).valid).toBe(true);
  });

  it("moves sessions off closed Sundays", () => {
    const wedding = "2026-05-12"; // T-2 for glow = May 10, a Sunday
    const r = generateSchedule({ weddingDate: wedding, requests: [{ treatmentId: "final-glow-facial", count: 1 }], today: TODAY });
    const out = applyCapacity(r.sessions, {}, DEFAULT_CLINIC, { weddingDate: wedding, today: TODAY });
    expect(out.sessions[0].date).toBe("2026-05-09");
    expect(out.sessions[0].shiftReason).toContain("closed");
  });
});

describe("rescheduleFrom", () => {
  const wedding = shiftDay(TODAY, 60);
  const base = () => {
    const r = generateSchedule({ weddingDate: wedding, requests: [{ treatmentId: "acne-peel", count: 3 }], today: TODAY });
    return { weddingDate: wedding, today: TODAY, sessions: r.sessions, capacityMap: {}, config: openConfig };
  };

  it("rebuilds downstream sessions after a missed one", () => {
    const state = base();
    const first = state.sessions[0];
    const res = rescheduleFrom({ ...state, today: first.date }, first.id, "missed");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.sessions.some((s) => s.status === "missed")).toBe(true);
    const active = res.sessions.filter((s) => s.status === "upcoming");
    expect(active).toHaveLength(3);
    expect(active.every((s) => s.date > first.date)).toBe(true);
    gapsOk(res.sessions);
    expect(res.changedIds.length).toBeGreaterThan(0);
  });

  it("rejects a move that breaks the rest gap and suggests a valid date", () => {
    const state = base();
    const second = state.sessions[1];
    const res = rescheduleFrom(state, second.id, shiftDay(state.sessions[0].date, 2));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.message).toContain("rest days");
    expect(res.suggestedDate).toBeDefined();
  });

  it("reports sessions that no longer fit after a late miss", () => {
    const w = shiftDay(TODAY, 40);
    const r = generateSchedule({ weddingDate: w, requests: [{ treatmentId: "acne-peel", count: 3 }], today: TODAY });
    const res = rescheduleFrom({ weddingDate: w, today: shiftDay(TODAY, 14), sessions: r.sessions, capacityMap: {}, config: openConfig }, r.sessions[0].id, "missed");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.unplaced[0]?.count).toBe(1);
  });
});

describe("parseConsultationNote", () => {
  it("reads counts and an upcoming month-day date", () => {
    const p = parseConsultationNote("Bride needs 3 acne peel sessions and 2 body polishing treatments. 12th Dec wedding.", TODAY);
    expect(p.weddingDate).toBe("2026-12-12");
    expect(p.requests).toEqual(
      expect.arrayContaining([
        { treatmentId: "acne-peel", count: 3 },
        { treatmentId: "body-polishing", count: 2 },
      ]),
    );
  });

  it("handles number words, synonyms and relative dates", () => {
    const p = parseConsultationNote("Wedding in 6 weeks. Wants two massages, a deep peel, laser x3 and a glow facial", TODAY);
    expect(p.weddingDate).toBe(shiftDay(TODAY, 42));
    const get = (id: string) => p.requests.find((r) => r.treatmentId === id)?.count;
    expect(get("relaxation-massage")).toBe(2);
    expect(get("deep-skin-peel")).toBe(1);
    expect(get("laser-hair-therapy")).toBe(3);
    expect(get("final-glow-facial")).toBe(1);
  });

  it("parses numeric and month-first dates, wraps to next year", () => {
    expect(parseConsultationNote("wedding 12/12/2026, hydrating facial", TODAY).weddingDate).toBe("2026-12-12");
    expect(parseConsultationNote("Jan 5 wedding", TODAY).weddingDate).toBe("2027-01-05");
    expect(parseConsultationNote("in 45 days", TODAY).weddingDate).toBe(shiftDay(TODAY, 45));
  });
});

describe("sessionsToIcs", () => {
  it("creates events with alarms", () => {
    const r = generateSchedule({ weddingDate: shiftDay(TODAY, 60), requests: pkg("classic"), today: TODAY });
    const { value } = sessionsToIcs(r.sessions, "Aisha");
    expect(value).toContain("BEGIN:VEVENT");
    expect(value).toContain("BEGIN:VALARM");
    expect(value).toContain("ORRO Wellness");
  });
});
