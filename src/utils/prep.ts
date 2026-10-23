import { getTreatment } from "@/data/treatments";
import { daysBetween, prettyDay, shiftDay } from "@/engine/dates";
import type { Session } from "@/types";

export function whenLabel(date: string, today: string): string {
  const d = daysBetween(today, date);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d < 0) return `${-d} day${d === -1 ? "" : "s"} ago`;
  return `in ${d} days`;
}

/** Prep guidance worded relative to today ("start avoiding retinol today"). */
export function dynamicPrep(session: Session, today: string): string {
  const t = getTreatment(session.treatmentId);
  const days = daysBetween(today, session.date);
  const leadDays = Math.ceil(t.prepLeadHours / 24);
  const firstSentence = t.prepInstructions.split(". ")[0].replace(/\.$/, "");
  if (days <= 0) return `Your session is today. ${t.prepInstructions}`;
  const which = days === 1 ? "tomorrow's session" : `your session on ${prettyDay(session.date)}`;
  if (days <= leadDays)
    return `Your session is ${days === 1 ? "tomorrow" : `in ${days} days`}: start your prep today. ${firstSentence} before ${which}.`;
  return `Your session is in ${days} days. Begin your prep routine on ${prettyDay(shiftDay(session.date, -leadDays))} (${t.prepLeadHours} hours before).`;
}

export function restLabel(treatmentId: string, days: number): string {
  const t = getTreatment(treatmentId);
  if (t.category === "intensive") return `${days} days rest · skin recovering`;
  if (t.id === "relaxation-massage") return `${days} days · muscles resetting`;
  return `${days} days · glow building`;
}
