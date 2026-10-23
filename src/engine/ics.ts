// Builds a real .ics calendar file (with 24h and 2h alarms) using the `ics` package.
import { createEvents, type EventAttributes } from "ics";
import { getTreatment } from "@/data/treatments";
import type { Session } from "@/types";

export function sessionsToIcs(sessions: Session[], brideName: string): { value?: string; error?: string } {
  const events: EventAttributes[] = sessions.map((s) => {
    const t = getTreatment(s.treatmentId);
    const [y, mo, d] = s.date.split("-").map(Number);
    const [h, mi] = s.time.split(":").map(Number);
    return {
      uid: `${s.id}-${s.date}@orro-wellness`,
      title: `ORRO: ${t.name} (${s.sequenceNumber} of ${s.totalOfThisTreatment})`,
      start: [y, mo, d, h, mi],
      startInputType: "local",
      startOutputType: "local",
      duration: { minutes: t.durationMin },
      location: "ORRO Wellness",
      description: `Bridal countdown for ${brideName || "our bride"}.\n\nBefore: ${t.prepInstructions}\n\nAfter: ${t.aftercareInstructions}`,
      alarms: [
        { action: "display", description: `Tomorrow: ${t.name} at ORRO Wellness`, trigger: { hours: 24, before: true } },
        { action: "display", description: `In 2 hours: ${t.name} at ORRO Wellness`, trigger: { hours: 2, before: true } },
      ],
    };
  });
  const { value, error } = createEvents(events);
  return { value: value ?? undefined, error: error ? String(error.message ?? error) : undefined };
}
