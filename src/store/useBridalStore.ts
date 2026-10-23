import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_CLINIC, seedCapacity } from "@/data/clinic";
import { PACKAGES } from "@/data/packages";
import {
  applyCapacity,
  generateSchedule,
  rescheduleFrom,
  shiftDay,
  todayDay,
  type RescheduleOutcome,
} from "@/engine";
import type { CapacityMap, ClinicConfig, PlanRequest, ScheduleResult, Session, Unplaced } from "@/types";

export type Role = "client" | "clinic";

export interface BrideRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  weddingDate: string;
  packageId: string | null;
  requests: PlanRequest[];
  schedule: ScheduleResult | null;
  disrupted: boolean;
  extraUnplaced: Unplaced[];
  channels: Record<string, Channel>;
}

export const STAFF_ACCOUNT = { email: "staff@orro.demo", password: "staff123" };
export const BRIDE_PASSWORD = "bride123";

export type Channel = "whatsapp" | "sms";
export type ScenarioId = "comfortable" | "compressed" | "infeasible" | "fullday" | "missed";

export const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: "comfortable", label: "90 days out (comfortable)" },
  { id: "compressed", label: "20 days out (compressed)" },
  { id: "infeasible", label: "7 days out (infeasible)" },
  { id: "fullday", label: "Full clinic day (shift demo)" },
  { id: "missed", label: "Missed appointment (disruption demo)" },
];

interface State {
  hydrated: boolean;
  today: string;
  brideName: string;
  weddingDate: string;
  packageId: string | null;
  requests: PlanRequest[];
  schedule: ScheduleResult | null;
  disrupted: boolean;
  extraUnplaced: Unplaced[];
  capacityMap: CapacityMap;
  config: ClinicConfig;
  channels: Record<string, Channel>;
  changedIds: string[];
  changeStamp: number;
  view: "client" | "clinic";
  role: Role | null;
  brides: BrideRecord[];
  activeBrideId: string | null;
}

interface Actions {
  init: () => void;
  setPlanInput: (p: Partial<Pick<State, "brideName" | "weddingDate" | "packageId" | "requests">>) => void;
  generate: () => ScheduleResult;
  reschedule: (id: string, target: string | "missed") => RescheduleOutcome;
  markCompleted: (id: string) => void;
  updateConfig: (c: Partial<ClinicConfig>) => void;
  toggleDayClosed: (date: string) => void;
  toggleDayFull: (date: string) => void;
  setChannel: (id: string, c: Channel) => void;
  loadScenario: (id: ScenarioId) => void;
  setView: (v: "client" | "clinic") => void;
  reset: () => void;
  rebalance: () => void;
  login: (email: string, password: string) => Role | null;
  logout: () => void;
  selectBride: (id: string) => void;
  startNewBride: () => void;
  deleteBride: (id: string) => void;
}

const initial = (today: string): Omit<State, "hydrated"> => ({
  today,
  brideName: "",
  weddingDate: "",
  packageId: null,
  requests: [],
  schedule: null,
  disrupted: false,
  extraUnplaced: [],
  capacityMap: today ? seedCapacity(today, DEFAULT_CLINIC) : {},
  config: DEFAULT_CLINIC,
  channels: {},
  changedIds: [],
  changeStamp: 0,
  view: "client",
  role: null,
  brides: [],
  activeBrideId: null,
});

const emailFor = (name: string, taken: string[]) => {
  const base = (name.trim().split(/\s+/)[0] || "bride").toLowerCase().replace(/[^a-z0-9]/g, "") || "bride";
  let e = `${base}@orro.demo`;
  for (let i = 2; taken.includes(e); i++) e = `${base}${i}@orro.demo`;
  return e;
};

/** Clinic bookings plus every OTHER bride's upcoming sessions, so brides share capacity. */
export function capacityWithOthers(s: Pick<State, "capacityMap" | "brides" | "activeBrideId" | "config">): CapacityMap {
  const map: CapacityMap = { ...s.capacityMap };
  for (const b of s.brides) {
    if (b.id === s.activeBrideId) continue;
    for (const x of b.schedule?.sessions ?? []) {
      if (x.status !== "upcoming") continue;
      const e = map[x.date] ?? { booked: 0, max: s.config.maxAppointmentsPerDay, closed: false };
      map[x.date] = { ...e, booked: e.booked + 1 };
    }
  }
  return map;
}

const workingCopy = (b: BrideRecord | undefined) => ({
  brideName: b?.name ?? "",
  weddingDate: b?.weddingDate ?? "",
  packageId: b?.packageId ?? null,
  requests: b?.requests ?? [],
  schedule: b?.schedule ?? null,
  disrupted: b?.disrupted ?? false,
  extraUnplaced: b?.extraUnplaced ?? [],
  channels: b?.channels ?? {},
  changedIds: [] as string[],
});

/** Runs the real engine: backward plan, then capacity balancing. */
function build(s: Pick<State, "weddingDate" | "requests" | "today" | "capacityMap" | "config">): ScheduleResult {
  const plan = generateSchedule({ weddingDate: s.weddingDate, requests: s.requests, today: s.today, capacityMap: s.capacityMap });
  const balanced = applyCapacity(plan.sessions, s.capacityMap, s.config, { weddingDate: s.weddingDate, today: s.today });
  return { ...plan, sessions: balanced.sessions, warnings: [...plan.warnings, ...balanced.warnings] };
}

const diffIds = (before: Session[], after: Session[]) => {
  const m = new Map(before.map((s) => [s.id, s.date + s.time]));
  return after.filter((s) => m.get(s.id) !== s.date + s.time).map((s) => s.id);
};

export const useBridalStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      hydrated: false,
      ...initial(""),

      init: () => {
        const today = todayDay();
        const s = get();
        if (s.today !== today || !Object.keys(s.capacityMap).length) {
          // New day: reseed clinic bookings around the real today.
          set({ today, capacityMap: seedCapacity(today, s.config) });
        }
        if (!get().brides.length) seedDemoBrides();
        set({ hydrated: true });
      },

      setPlanInput: (p) => set(p),

      generate: () => {
        const s = get();
        const schedule = build({ ...s, capacityMap: capacityWithOthers(s) });
        if (!s.activeBrideId) {
          const id = `bride-${Date.now().toString(36)}`;
          const rec: BrideRecord = {
            id,
            name: s.brideName.trim() || "New bride",
            email: emailFor(s.brideName, s.brides.map((b) => b.email)),
            password: BRIDE_PASSWORD,
            weddingDate: s.weddingDate,
            packageId: s.packageId,
            requests: s.requests,
            schedule,
            disrupted: false,
            extraUnplaced: [],
            channels: {},
          };
          set({ brides: [...s.brides, rec], activeBrideId: id });
        }
        set({ schedule, disrupted: false, extraUnplaced: [], changedIds: schedule.sessions.map((x) => x.id), changeStamp: Date.now() });
        return schedule;
      },

      reschedule: (id, target) => {
        const s = get();
        if (!s.schedule) return { ok: false, message: "No plan yet." };
        const out = rescheduleFrom(
          { weddingDate: s.weddingDate, today: s.today, sessions: s.schedule.sessions, capacityMap: capacityWithOthers(s), config: s.config },
          id,
          target,
        );
        if (out.ok) {
          const extraUnplaced = [...s.extraUnplaced, ...out.unplaced];
          set({
            schedule: {
              ...s.schedule,
              sessions: out.sessions,
              status: extraUnplaced.length ? "infeasible" : s.schedule.status,
              warnings: [...new Set([...s.schedule.warnings, ...out.warnings])],
            },
            extraUnplaced,
            disrupted: true,
            changedIds: out.changedIds,
            changeStamp: Date.now(),
          });
        }
        return out;
      },

      markCompleted: (id) => {
        const s = get();
        if (!s.schedule) return;
        set({
          schedule: { ...s.schedule, sessions: s.schedule.sessions.map((x) => (x.id === id ? { ...x, status: "completed" } : x)) },
          disrupted: true,
          changedIds: [id],
          changeStamp: Date.now(),
        });
      },

      updateConfig: (c) => {
        const s = get();
        const config = { ...s.config, ...c };
        const capacityMap = { ...s.capacityMap };
        if (c.maxAppointmentsPerDay !== undefined)
          for (const d of Object.keys(capacityMap))
            capacityMap[d] = { ...capacityMap[d], max: config.maxAppointmentsPerDay, booked: Math.min(capacityMap[d].booked, config.maxAppointmentsPerDay) };
        set({ config, capacityMap });
        get().rebalance();
      },

      toggleDayClosed: (date) => {
        const s = get();
        const e = s.capacityMap[date] ?? { booked: 0, max: s.config.maxAppointmentsPerDay, closed: false };
        set({ capacityMap: { ...s.capacityMap, [date]: { ...e, closed: !e.closed } } });
        get().rebalance();
      },

      toggleDayFull: (date) => {
        const s = get();
        const e = s.capacityMap[date] ?? { booked: 0, max: s.config.maxAppointmentsPerDay, closed: false };
        const booked = e.booked >= e.max ? Math.max(0, e.max - 3) : e.max;
        set({ capacityMap: { ...s.capacityMap, [date]: { ...e, booked } } });
        get().rebalance();
      },

      setChannel: (id, c) => set({ channels: { ...get().channels, [id]: c } }),
      setView: (view) => set({ view }),
      login: (email, password) => {
        const e = email.trim().toLowerCase();
        if (e === STAFF_ACCOUNT.email && password === STAFF_ACCOUNT.password) {
          set({ role: "clinic" });
          return "clinic";
        }
        const b = get().brides.find((x) => x.email === e && x.password === password);
        if (!b) return null;
        set({ role: "client", activeBrideId: b.id, ...workingCopy(b) });
        return "client";
      },
      selectBride: (id) => set({ activeBrideId: id, ...workingCopy(get().brides.find((b) => b.id === id)) }),
      startNewBride: () => set({ activeBrideId: null, ...workingCopy(undefined) }),
      deleteBride: (id) => {
        const s = get();
        set({ brides: s.brides.filter((b) => b.id !== id) });
        if (s.activeBrideId === id) get().startNewBride();
      },
      logout: () => set({ role: null }),

      loadScenario: (id) => {
        const today = todayDay();
        const pkg = (pid: string) => PACKAGES.find((p) => p.id === pid)!.requests;
        const presets: Record<ScenarioId, { name: string; days: number; packageId: string | null; requests: PlanRequest[] }> = {
          comfortable: { name: "Aisha Kapoor", days: 90, packageId: "complete", requests: pkg("complete") },
          compressed: {
            name: "Riya Mehta",
            days: 20,
            packageId: null,
            requests: [
              { treatmentId: "hydrating-facial", count: 3 },
              { treatmentId: "body-polishing", count: 3 },
              { treatmentId: "relaxation-massage", count: 2 },
              { treatmentId: "final-glow-facial", count: 1 },
            ],
          },
          infeasible: { name: "Sara Thomas", days: 7, packageId: "complete", requests: pkg("complete") },
          fullday: { name: "Nisha Rao", days: 54, packageId: "classic", requests: pkg("classic") },
          missed: { name: "Emma Fernandes", days: 45, packageId: "radiance", requests: pkg("radiance") },
        };
        const p = presets[id];
        // Replace an earlier copy of this demo bride, keep everyone else.
        const old = get().brides.find((b) => b.name === p.name);
        if (old) set({ brides: get().brides.filter((b) => b.id !== old.id) });
        set({ activeBrideId: null, ...workingCopy(undefined), brideName: p.name, weddingDate: shiftDay(today, p.days), packageId: p.packageId, requests: p.requests });
        get().generate();
        if (id === "missed") {
          const first = get().schedule!.sessions.find((x) => x.status === "upcoming");
          if (first) get().reschedule(first.id, "missed");
        }
      },

      reset: () => {
        set({ ...initial(todayDay()), role: get().role, hydrated: true });
        seedDemoBrides();
      },

      // Internal: rerun capacity after staff changes.
      rebalance: () => {
        const s = get();
        if (!s.schedule) return;
        const before = s.schedule.sessions;
        let schedule: ScheduleResult;
        if (!s.disrupted) schedule = build({ ...s, capacityMap: capacityWithOthers(s) });
        else {
          const r = applyCapacity(before, capacityWithOthers(s), s.config, { weddingDate: s.weddingDate, today: s.today });
          schedule = { ...s.schedule, sessions: r.sessions, warnings: [...new Set([...s.schedule.warnings, ...r.warnings])] };
        }
        set({ schedule, changedIds: diffIds(before, schedule.sessions), changeStamp: Date.now() });
      },
    }),
    {
      name: "orro-bridal-countdown-v3",
      skipHydration: true,
      partialize: ({ hydrated: _h, changedIds: _c, ...rest }) => rest,
    },
  ),
);

/** Three brides at different stages so the clinic has a realistic roster. */
function seedDemoBrides() {
  const st = useBridalStore.getState();
  const role = st.role;
  for (const id of ["comfortable", "fullday", "missed"] as ScenarioId[]) useBridalStore.getState().loadScenario(id);
  if (role === "clinic") useBridalStore.getState().selectBride(useBridalStore.getState().brides[0].id);
}

// Keep the active bride's record in step with the working copy shown on screen.
useBridalStore.subscribe((s, prev) => {
  if (!s.activeBrideId) return;
  if (s.schedule === prev.schedule && s.brideName === prev.brideName && s.weddingDate === prev.weddingDate && s.requests === prev.requests && s.channels === prev.channels && s.extraUnplaced === prev.extraUnplaced) return;
  const idx = s.brides.findIndex((b) => b.id === s.activeBrideId);
  if (idx < 0) return;
  const b = s.brides[idx];
  const next: BrideRecord = { ...b, name: s.brideName || b.name, weddingDate: s.weddingDate, packageId: s.packageId, requests: s.requests, schedule: s.schedule, disrupted: s.disrupted, extraUnplaced: s.extraUnplaced, channels: s.channels };
  const brides = [...s.brides];
  brides[idx] = next;
  useBridalStore.setState({ brides });
});
