import { daysBetween, longDay } from "@/engine";
import type { ScheduleResult } from "@/types";
import { SafetyBadge, StatusBadge } from "./StatusBadge";

export function CountdownHeader({
  brideName,
  weddingDate,
  today,
  status,
  valid,
  violations,
}: {
  brideName: string;
  weddingDate: string;
  today: string;
  status: ScheduleResult["status"];
  valid: boolean;
  violations: number;
}) {
  const days = daysBetween(today, weddingDate);
  return (
    <section className="animate-rise relative overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-soft">
      <p className="text-xs uppercase tracking-[0.25em] opacity-80">{brideName ? `${brideName}'s countdown` : "Your countdown"}</p>
      <h1 className="mt-3 font-display text-5xl font-semibold leading-none md:text-6xl">
        {days > 0 ? days : 0}
        <span className="ml-3 align-middle font-sans text-base font-medium opacity-90">
          {days === 1 ? "day to your big day" : days > 0 ? "days to your big day" : "Today is your day"}
        </span>
      </h1>
      <p className="mt-2 text-sm opacity-90">{longDay(weddingDate)}</p>
      <div className="mt-4 flex flex-wrap gap-2 rounded-2xl bg-card/95 p-2">
        <StatusBadge status={status} />
        <SafetyBadge valid={valid} count={violations} />
      </div>
    </section>
  );
}
