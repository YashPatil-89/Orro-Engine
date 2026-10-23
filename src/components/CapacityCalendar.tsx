import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { dayStatus, fromDay, toDay } from "@/engine";
import type { CapacityMap, ClinicConfig, Session } from "@/types";
import { cn } from "@/lib/utils";

export function CapacityCalendar({
  month,
  onMonth,
  capacityMap,
  config,
  sessions,
  today,
  weddingDate,
  onSelect,
}: {
  month: string; // yyyy-MM-01
  onMonth: (m: string) => void;
  capacityMap: CapacityMap;
  config: ClinicConfig;
  sessions: Session[];
  today: string;
  weddingDate: string;
  onSelect: (d: string) => void;
}) {
  const start = fromDay(month);
  const days = eachDayOfInterval({ start: startOfWeek(start, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(start), { weekStartsOn: 1 }) });
  const brideOn = (d: string) => sessions.filter((s) => s.date === d && s.status !== "missed");

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => onMonth(toDay(addMonths(start, -1)))} className="rounded-full p-2 hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
        <h2 className="font-display text-xl font-semibold">{format(start, "MMMM yyyy")}</h2>
        <button type="button" aria-label="Next month" onClick={() => onMonth(toDay(addMonths(start, 1)))} className="rounded-full p-2 hover:bg-muted"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((dt) => {
          const d = toDay(dt);
          const inMonth = dt.getMonth() === start.getMonth();
          const ds = dayStatus(d, capacityMap, config);
          const mine = brideOn(d);
          const load = ds.booked + mine.filter((s) => s.status === "upcoming").length;
          const ratio = load / ds.max;
          const tone = ds.closed ? "bg-heat-closed text-muted-foreground" : ratio >= 1 ? "bg-heat-full" : ratio >= 0.67 ? "bg-heat-busy" : "bg-heat-free";
          const past = d < today;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              aria-label={`${format(dt, "EEEE MMMM d")}: ${ds.closed ? "closed" : `${load} of ${ds.max} booked`}${mine.length ? `, ${mine.length} bridal session` : ""}`}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs transition-transform hover:scale-105",
                tone,
                !inMonth && "opacity-30",
                past && "opacity-50",
                mine.some((s) => s.shifted) && "ring-2 ring-warning",
                d === weddingDate && "ring-2 ring-primary",
              )}
            >
              <span className="font-semibold">{dt.getDate()}</span>
              <span className="text-[10px] opacity-80">{ds.closed ? "Closed" : `${load}/${ds.max}`}</span>
              {mine.length > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />}
              {d === weddingDate && <span className="absolute bottom-0.5 text-[9px] font-bold text-primary">♥</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-heat-free" /> Free</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-heat-busy" /> Nearly full</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-heat-full" /> Full</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-heat-closed" /> Closed</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-primary" /> Bride's session</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded ring-2 ring-warning" /> Shifted here</span>
      </div>
    </section>
  );
}
