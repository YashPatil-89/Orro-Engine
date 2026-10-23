import type { CapacityMap, ClinicConfig } from "@/types";
import { shiftDay } from "@/engine/dates";

export const DEFAULT_CLINIC: ClinicConfig = {
  maxAppointmentsPerDay: 6,
  openHour: 9,
  closeHour: 18,
  slotMinutes: 60,
  rooms: 3,
  specialists: 4,
  sundayClosed: true,
};

/** Small deterministic hash so the same date always gets the same bookings. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Days (offsets from today) the clinic is closed for staff training, used by the shift demo. */
export const CLOSED_DAY_OFFSETS = [38];

/**
 * Starts the clinic calendar empty: the only appointments are the brides' own
 * sessions. One staff-training day is closed so the shift demo has something to avoid.
 */
export function seedCapacity(today: string, config: ClinicConfig, days = 120): CapacityMap {
  const map: CapacityMap = {};
  for (let i = 0; i <= days; i++) {
    map[shiftDay(today, i)] = { booked: 0, max: config.maxAppointmentsPerDay, closed: CLOSED_DAY_OFFSETS.includes(i) };
  }
  return map;
}

const CLIENTS = ["Ananya R.", "Meera K.", "Sofia L.", "Priya S.", "Hannah W.", "Zara M.", "Isha P.", "Leila A.", "Kavya N.", "Chloe B."];
const SERVICES = ["Hydrating Facial", "Relaxation Massage", "Acne Peel", "Body Polishing", "Laser Hair Therapy", "Brow Shaping"];

/** Existing (non-bride) appointments for a day, with stable times and names. */
export function existingAppointments(date: string, booked: number, config: ClinicConfig) {
  const slots = allSlots(config);
  const h = hashString(date + "slots");
  const order = slots
    .map((s, i) => ({ s, k: hashString(`${h}-${i}`) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.s);
  return order
    .slice(0, Math.min(booked, slots.length))
    .sort()
    .map((time, i) => ({
      time,
      client: CLIENTS[(h + i) % CLIENTS.length],
      service: SERVICES[(h >> 3 + i) % SERVICES.length] ?? SERVICES[i % SERVICES.length],
    }));
}

export function allSlots(config: ClinicConfig): string[] {
  const out: string[] = [];
  for (let m = config.openHour * 60; m + config.slotMinutes <= config.closeHour * 60; m += config.slotMinutes) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}
