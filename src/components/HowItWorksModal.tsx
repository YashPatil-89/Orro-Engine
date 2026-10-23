import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STEPS = [
  {
    title: "1. We plan backwards from your wedding",
    body: "Your wedding day never moves. Each treatment's last session is pinned to the latest safe day before it (peels 14–16 days out, the Final Glow Facial exactly 2 days before), then earlier sessions are spaced behind it with the recommended rest.",
  },
  {
    title: "2. Short on time? We compress, safely",
    body: "If the plan would need to start before tomorrow, every rest gap is shortened by the same proportion, but never below the medical minimum. If even minimum gaps don't fit, we keep the sessions closest to the wedding and tell you exactly what was left out and why.",
  },
  {
    title: "3. Intensive treatments never crowd each other",
    body: "Two different intensive treatments (laser, deep peel, acne peel) are always at least 5 days apart so your skin can recover.",
  },
  {
    title: "4. We work around a busy clinic",
    body: "If a day is fully booked or closed, the session moves to the nearest safe day, preferring earlier. If that squeezes the rest before it, the earlier session moves too, all the way down the chain.",
  },
  {
    title: "5. Life happens: we re-plan instantly",
    body: "Missed or moved a session? We rebuild the remaining sessions of that treatment around the fixed wedding date and re-check clinic capacity. Changed sessions glow so you can see what moved.",
  },
];

export function HowItWorksModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">How your countdown works</DialogTitle>
          <DialogDescription>The rules ORRO's planner follows for every bride.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-4">
          {STEPS.map((s) => (
            <li key={s.title} className="rounded-2xl bg-soft p-4">
              <h3 className="font-display text-base font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
