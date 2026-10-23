import { MessageCircle, Smartphone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTreatment } from "@/data/treatments";
import { longDay, prettyDay, shiftDay } from "@/engine";
import { useBridalStore, type Channel } from "@/store/useBridalStore";
import type { Session } from "@/types";
import { cn } from "@/lib/utils";

const minus2h = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return `${String(h - 2).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export function ReminderList() {
  const s = useBridalStore();
  const [preview, setPreview] = useState<Session | null>(null);
  const upcoming = (s.schedule?.sessions ?? []).filter((x) => x.status === "upcoming");
  if (!upcoming.length) return <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">No upcoming sessions to remind about.</p>;

  return (
    <>
      <ul className="space-y-3">
        {upcoming.map((x) => {
          const t = getTreatment(x.treatmentId);
          const ch: Channel = s.channels[x.id] ?? "whatsapp";
          return (
            <li key={x.id} className="rounded-2xl border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold">{t.name}</h3>
                  <p className="text-sm text-muted-foreground">{longDay(x.date)} · {x.time}</p>
                </div>
                <div role="radiogroup" aria-label="Reminder channel" className="flex rounded-full bg-muted p-1 text-xs font-semibold">
                  {(["whatsapp", "sms"] as const).map((c) => (
                    <button
                      key={c}
                      role="radio"
                      aria-checked={ch === c}
                      type="button"
                      onClick={() => s.setChannel(x.id, c)}
                      className={cn("rounded-full px-3 py-1", ch === c ? "bg-card text-primary shadow-soft" : "text-muted-foreground")}
                    >
                      {c === "whatsapp" ? "WhatsApp" : "SMS"}
                    </button>
                  ))}
                </div>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <li className="rounded-xl bg-blush-soft p-2"><b>24h before</b><br />{prettyDay(shiftDay(x.date, -1))}, {x.time}</li>
                <li className="rounded-xl bg-gold-soft p-2"><b>2h before</b><br />{prettyDay(x.date)}, {minus2h(x.time)}</li>
              </ul>
              <Button size="sm" variant="outline" className="mt-3 rounded-full" onClick={() => setPreview(x)}>Send test reminder</Button>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          {preview && (() => {
            const t = getTreatment(preview.treatmentId);
            const ch = s.channels[preview.id] ?? "whatsapp";
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display">Test reminder preview</DialogTitle>
                  <DialogDescription>Demo mode: nothing was sent.</DialogDescription>
                </DialogHeader>
                <div className="rounded-[2rem] border-8 border-foreground/90 bg-muted p-3">
                  <div className="mb-3 flex items-center gap-2 border-b pb-2 text-xs font-semibold">
                    {ch === "whatsapp" ? <MessageCircle className="h-4 w-4 text-success" /> : <Smartphone className="h-4 w-4" />}
                    ORRO Wellness · {ch === "whatsapp" ? "WhatsApp" : "SMS"}
                  </div>
                  <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-card p-3 text-sm shadow-soft">
                    <p>Hi {s.brideName || "there"} 💐 Your <b>{t.name}</b> (session {preview.sequenceNumber} of {preview.totalOfThisTreatment}) is tomorrow, {prettyDay(preview.date)} at {preview.time}.</p>
                    <p className="mt-2"><b>Prep:</b> {t.prepInstructions}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Reply 1 to confirm, 2 to reschedule.</p>
                    <p className="mt-1 text-right text-[10px] text-muted-foreground">{preview.time} ✓✓</p>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
