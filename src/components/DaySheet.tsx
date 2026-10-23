import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { existingAppointments } from "@/data/clinic";
import { getTreatment } from "@/data/treatments";
import { dayStatus, longDay } from "@/engine";
import { useBridalStore } from "@/store/useBridalStore";
import { cn } from "@/lib/utils";

export function DaySheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const s = useBridalStore();
  if (!date) return <Sheet open={false} />;
  const ds = dayStatus(date, s.capacityMap, s.config);
  const existing = existingAppointments(date, ds.booked, s.config).map((a) => ({ ...a, bride: false, note: "" }));
  const mine = s.brides.flatMap((b) =>
    (b.id === s.activeBrideId ? s.schedule?.sessions ?? [] : b.schedule?.sessions ?? [])
      .filter((x) => x.date === date && x.status !== "missed")
      .map((x) => ({ time: x.time, client: b.name, service: getTreatment(x.treatmentId).name, bride: true, note: x.shiftReason ?? "" })),
  );
  const all = [...existing, ...mine].sort((a, b) => (a.time < b.time ? -1 : 1));
  const manualClosed = !!s.capacityMap[date]?.closed;
  const full = ds.booked >= ds.max;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-h-[85vh] max-w-lg overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{longDay(date)}</SheetTitle>
          <SheetDescription>
            {ds.closed ? "Clinic closed" : `${ds.booked + mine.length} of ${ds.max} appointments booked · ${s.config.rooms} rooms · ${s.config.specialists} specialists`}
          </SheetDescription>
        </SheetHeader>
        <ul className="mt-2 space-y-2 px-1">
          {all.length === 0 && <li className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">No appointments yet.</li>}
          {all.map((a, i) => (
            <li key={i} className={cn("flex gap-3 rounded-xl border p-3 text-sm", a.bride && "border-gold bg-gold-soft")}>
              <span className="w-12 font-semibold tabular-nums">{a.time}</span>
              <div>
                <p className="font-medium">{a.service}</p>
                <p className="text-xs text-muted-foreground">{a.client}{a.bride && " · bridal countdown"}</p>
                {a.note && <p className="mt-1 text-xs text-warning">{a.note}</p>}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2 px-1 pb-4">
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => s.toggleDayClosed(date)}>
            {manualClosed ? "Reopen day" : "Mark closed"}
          </Button>
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => s.toggleDayFull(date)} disabled={ds.closed}>
            {full ? "Free up slots" : "Mark fully booked"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
