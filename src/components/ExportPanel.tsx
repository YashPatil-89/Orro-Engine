import { CalendarPlus, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getTreatment } from "@/data/treatments";
import { longDay, sessionsToIcs } from "@/engine";
import { useBridalStore } from "@/store/useBridalStore";
import type { Session } from "@/types";

function download(sessions: Session[], name: string, filename: string) {
  const { value, error } = sessionsToIcs(sessions, name);
  if (!value) { toast.error(`Couldn't create the calendar file. ${error ?? ""}`); return; }
  const url = URL.createObjectURL(new Blob([value], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success("Calendar file downloaded. Open it to add your sessions.");
}

export function ExportPanel() {
  const s = useBridalStore();
  const upcoming = (s.schedule?.sessions ?? []).filter((x) => x.status === "upcoming");
  const slug = (s.brideName || "bride").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const subscribe = `webcal://demo.orro-wellness.com/calendar/${slug}-${s.weddingDate}.ics`;

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-hero p-6 text-primary-foreground shadow-soft">
        <CalendarPlus className="h-8 w-8 text-gold" aria-hidden />
        <h2 className="mt-2 font-display text-2xl font-semibold">Add your countdown to your calendar</h2>
        <p className="mt-1 text-sm opacity-90">{upcoming.length} sessions with reminders 24 hours and 2 hours before. Works with Google, Apple and Outlook.</p>
        <Button variant="secondary" size="lg" className="mt-4 rounded-full" disabled={!upcoming.length} onClick={() => download(upcoming, s.brideName, `orro-bridal-countdown-${slug}.ics`)}>
          <Download className="mr-2 h-4 w-4" /> Add to Calendar
        </Button>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Subscribe link <span className="ml-1 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold uppercase text-warning">Demo URL</span></h2>
        <p className="mt-1 text-sm text-muted-foreground">A live feed would keep your calendar in sync after every change. This sample link shows the format; it isn't hosted.</p>
        <div className="mt-3 flex gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-muted px-3 py-2 text-xs">{subscribe}</code>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            aria-label="Copy subscribe link"
            onClick={() => navigator.clipboard.writeText(subscribe).then(() => toast.success("Demo link copied."), () => toast.error("Couldn't copy. Select the link and copy it manually."))}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Individual sessions</h2>
        {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming sessions.</p>}
        <ul className="space-y-2">
          {upcoming.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3">
              <div className="min-w-0">
                <p className="font-medium">{getTreatment(x.treatmentId).name}</p>
                <p className="text-xs text-muted-foreground">{longDay(x.date)} · {x.time}</p>
              </div>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => download([x], s.brideName, `orro-${x.id}.ics`)}>
                Add this one
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
