import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { dayStatus, prettyDay, shiftDay } from "@/engine";
import { CapacityCalendar } from "@/components/CapacityCalendar";
import { BrideRoster } from "@/components/BrideRoster";
import { DaySheet } from "@/components/DaySheet";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useBridalStore } from "@/store/useBridalStore";

export function ClinicPage() {
  const s = useBridalStore();
  const [month, setMonth] = useState(() => (s.schedule?.sessions.find((x) => x.status === "upcoming")?.date ?? s.today).slice(0, 8) + "01");
  const [day, setDay] = useState<string | null>(null);
  const allSessions = s.brides.flatMap((b) => (b.id === s.activeBrideId ? s.schedule?.sessions ?? [] : b.schedule?.sessions ?? []));
  const upcoming = allSessions.filter((x) => x.status === "upcoming");
  const todayStatus = dayStatus(s.today, s.capacityMap, s.config);
  let nextFree = "";
  for (let i = 1; i < 60 && !nextFree; i++) {
    const d = shiftDay(s.today, i);
    const ds = dayStatus(d, s.capacityMap, s.config);
    if (!ds.closed && ds.booked + upcoming.filter((x) => x.date === d).length < ds.max) nextFree = prettyDay(d);
  }
  const fullSoon = Array.from({ length: 30 }, (_, i) => shiftDay(s.today, i + 1)).filter((d) => {
    const ds = dayStatus(d, s.capacityMap, s.config);
    return !ds.closed && ds.booked >= ds.max;
  }).length;
  const stats = [
    { label: "Booked today", value: todayStatus.closed ? "Closed" : `${todayStatus.booked}/${todayStatus.max}` },
    { label: "Full days (next 30)", value: String(fullSoon) },
    { label: "Next free slot", value: nextFree || "—" },
    { label: "Bridal sessions (all brides)", value: String(upcoming.length) },
  ];
  const shifted = (s.schedule?.sessions ?? []).filter((x) => x.shifted && x.status === "upcoming");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Staff view</p>
        <h1 className="text-3xl font-semibold">Clinic dashboard</h1>
        <p className="text-sm text-muted-foreground">Tap a day to see appointments. Bridal sessions from every bride share the same daily capacity.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((x) => (
          <div key={x.label} className="rounded-2xl border bg-card p-4 shadow-soft">
            <p className="text-xs text-muted-foreground">{x.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{x.value}</p>
          </div>
        ))}
      </section>

      <BrideRoster />

      <CapacityCalendar
        month={month}
        onMonth={setMonth}
        capacityMap={s.capacityMap}
        config={s.config}
        sessions={allSessions}
        today={s.today}
        weddingDate={s.weddingDate}
        onSelect={setDay}
      />

      {shifted.length > 0 && (
        <section className="rounded-2xl border bg-warning-soft p-4 text-sm">
          <h2 className="font-display text-lg font-semibold">Shifted bridal sessions</h2>
          <ul className="mt-2 space-y-1">
            {shifted.map((x) => (
              <li key={x.id}>• {x.shiftReason}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="text-xl font-semibold">Clinic settings</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="cap">Max appointments per day</Label>
            <span className="font-semibold tabular-nums">{s.config.maxAppointmentsPerDay}</span>
          </div>
          <Slider id="cap" min={2} max={9} step={1} value={[s.config.maxAppointmentsPerDay]} onValueChange={([v]) => s.updateConfig({ maxAppointmentsPerDay: v })} />
          <p className="text-xs text-muted-foreground">Open 09:00–18:00 in 60-minute slots · {s.config.rooms} rooms · {s.config.specialists} specialists</p>
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="sun">Closed on Sundays</Label>
          <Switch id="sun" checked={s.config.sundayClosed} onCheckedChange={(v) => s.updateConfig({ sundayClosed: v })} />
        </div>
      </section>

      <DaySheet date={day} onClose={() => setDay(null)} />
    </div>
  );
}
