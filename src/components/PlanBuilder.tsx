import { useNavigate } from "@tanstack/react-router";
import { CalendarIcon, Minus, Plus, Sparkles, Wand2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { PACKAGES } from "@/data/packages";
import { TREATMENTS, getTreatment } from "@/data/treatments";
import { daysBetween, estimateLeadTime, fromDay, longDay, ruleBasedParser, toDay } from "@/engine";
import { useBridalStore } from "@/store/useBridalStore";
import type { ParsedNote, PlanRequest } from "@/types";
import { cn } from "@/lib/utils";

function Counter({ value, onChange, label, max }: { value: number; onChange: (n: number) => void; label: string; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`Fewer ${label}`} disabled={value <= 0} onClick={() => onChange(value - 1)} className="grid h-8 w-8 place-items-center rounded-full border bg-card disabled:opacity-40">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-5 text-center font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid h-8 w-8 place-items-center rounded-full border bg-card disabled:opacity-40">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function PlanBuilder() {
  const navigate = useNavigate();
  const activeBrideId = useBridalStore((s) => s.activeBrideId);
  const startNewBride = useBridalStore((s) => s.startNewBride);
  const { today, brideName, weddingDate, packageId, requests, setPlanInput, generate } = useBridalStore();
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<ParsedNote | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const counts = useMemo(() => new Map(requests.map((r) => [r.treatmentId, r.count])), [requests]);
  const total = requests.reduce((s, r) => s + r.count, 0);
  const lead = useMemo(() => estimateLeadTime(requests), [requests]);
  const daysLeft = weddingDate ? daysBetween(today, weddingDate) : null;

  const setCount = (id: string, n: number) => {
    const next = TREATMENTS.map((t) => ({ treatmentId: t.id, count: t.id === id ? n : counts.get(t.id) ?? 0 })).filter((r) => r.count > 0);
    setPlanInput({ requests: next, packageId: null });
  };

  const smartFill = () => {
    if (!notes.trim()) { toast.error("Paste the consultation notes first."); return; }
    const parsed = ruleBasedParser.parse(notes, today);
    if (!parsed.requests.length && !parsed.weddingDate) toast.error("We couldn't find treatments or a date in those notes. Try wording like “3 acne peels, wedding 12 Dec”.");
    else setPreview(parsed);
  };

  const submit = () => {
    const errs: string[] = [];
    if (!brideName.trim()) errs.push("Add the bride's name.");
    if (!weddingDate) errs.push("Pick the wedding date.");
    else if (daysLeft !== null && daysLeft <= 0) errs.push("The wedding date must be in the future.");
    if (!total) errs.push("Choose a package or add at least one treatment.");
    setErrors(errs);
    if (errs.length) return;
    generate();
    const email = useBridalStore.getState().brides.find((b) => b.id === useBridalStore.getState().activeBrideId)?.email;
    toast.success(`${activeBrideId ? "Plan updated" : "Plan created"} for ${brideName}.`, { description: email ? `Bride login: ${email} / bride123` : undefined });
    navigate({ to: "/timeline" });
  };

  return (
    <div className="space-y-6">
      <section className="animate-rise overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-soft">
        <p className="text-xs uppercase tracking-[0.25em] opacity-80">ORRO Wellness</p>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-tight md:text-4xl">Plan your bridal glow, backwards from the big day.</h1>
        <p className="mt-2 max-w-md text-sm opacity-90">We pin every treatment to the safest day before your wedding and protect your skin's rest periods along the way.</p>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">{activeBrideId ? `Editing ${brideName || "bride"}'s plan` : "New bride"}</h2>
          {activeBrideId && (
            <Button size="sm" variant="outline" className="rounded-full" onClick={startNewBride}>+ New bride instead</Button>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bride">Bride's name</Label>
          <Input id="bride" placeholder="e.g. Aisha Kapoor" value={brideName} onChange={(e) => setPlanInput({ brideName: e.target.value })} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>Wedding date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start rounded-xl font-normal", !weddingDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {weddingDate ? longDay(weddingDate) : "Choose the wedding date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={weddingDate ? fromDay(weddingDate) : undefined}
                onSelect={(d) => d && setPlanInput({ weddingDate: toDay(d) })}
                disabled={(d) => toDay(d) <= today}
                defaultMonth={weddingDate ? fromDay(weddingDate) : undefined}
                className="pointer-events-auto p-3"
              />
            </PopoverContent>
          </Popover>
          {daysLeft !== null && (
            <p className={cn("text-sm", daysLeft <= 0 ? "text-destructive" : "text-muted-foreground")}>
              {daysLeft <= 0 ? "That date has passed. Please pick an upcoming date." : `${daysLeft} days to go. The wedding date stays fixed; we plan around it.`}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border bg-soft p-5">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-gold" aria-hidden />
          <h2 className="text-xl font-semibold">Paste consultation notes</h2>
        </div>
        <Label htmlFor="notes" className="sr-only">Consultation notes</Label>
        <Textarea
          id="notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Bride wants 3 acne peel sessions and 2 body polishing treatments, plus a glow facial. 12th Dec wedding."
          className="rounded-xl bg-card"
        />
        <Button variant="secondary" onClick={smartFill} className="rounded-full">
          <Sparkles className="mr-2 h-4 w-4" /> Smart Fill
        </Button>
        {preview && (
          <SmartFillPreview
            preview={preview}
            today={today}
            onChange={setPreview}
            onDiscard={() => setPreview(null)}
            onApply={() => {
              setPlanInput({ requests: preview.requests.filter((r) => r.count > 0), packageId: null, ...(preview.weddingDate ? { weddingDate: preview.weddingDate } : {}) });
              setPreview(null);
              toast.success("Notes applied to the plan.");
            }}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Choose a package</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {PACKAGES.map((p) => {
            const active = packageId === p.id;
            const l = estimateLeadTime(p.requests);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => setPlanInput({ packageId: p.id, requests: p.requests })}
                className={cn("rounded-2xl border bg-card p-4 text-left shadow-soft transition-all hover:-translate-y-0.5", active && "border-gold shadow-glow")}
              >
                <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                <ul className="mt-3 space-y-0.5 text-xs">
                  {p.requests.map((r) => (
                    <li key={r.treatmentId}>{r.count} × {getTreatment(r.treatmentId).name}</li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] font-medium text-gold">Ideal lead time: {l.comfortable} days</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
        <div>
          <h2 className="text-xl font-semibold">Or build a custom plan</h2>
          <p className="text-sm text-muted-foreground">Adjust any package or start from scratch.</p>
        </div>
        <ul className="divide-y">
          {TREATMENTS.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.durationMin} min · {t.category === "intensive" ? "Intensive" : "Gentle"}
                  {t.singleSession ? " · exactly 2 days before" : ` · ${t.minGapDays}–${t.preferredGapDays} days apart`}
                </p>
              </div>
              <Counter value={counts.get(t.id) ?? 0} onChange={(n) => setCount(t.id, n)} label={t.plural} max={t.singleSession ? 1 : 6} />
            </li>
          ))}
        </ul>
        <div className="rounded-xl bg-gold-soft px-4 py-3 text-sm text-accent-foreground" aria-live="polite">
          {total === 0
            ? "Add treatments to see how much lead time this plan needs."
            : `${total} sessions · needs at least ${lead.minimum} days (ideally ${lead.comfortable} days) before the wedding.${
                daysLeft !== null && daysLeft > 0
                  ? daysLeft >= lead.comfortable
                    ? " You have plenty of time."
                    : daysLeft >= lead.minimum
                      ? " We'll compress the rest periods safely."
                      : " Not everything will fit. We'll show what's possible."
                  : ""
              }`}
        </div>
      </section>

      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
      <Button size="lg" onClick={submit} className="h-14 w-full rounded-full text-base shadow-soft">
        Generate My Countdown
      </Button>
    </div>
  );
}

function SmartFillPreview({
  preview,
  today,
  onChange,
  onApply,
  onDiscard,
}: {
  preview: ParsedNote;
  today: string;
  onChange: (p: ParsedNote) => void;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const setReq = (rs: PlanRequest[]) => onChange({ ...preview, requests: rs });
  const missing = TREATMENTS.filter((t) => !preview.requests.some((r) => r.treatmentId === t.id));
  return (
    <div className="animate-rise space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">We found ({Math.round(preview.confidence * 100)}% confident)</p>
        <button type="button" onClick={onDiscard} aria-label="Discard" className="text-muted-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-1">
        <Label htmlFor="pv-date">Wedding date</Label>
        <Input id="pv-date" type="date" min={today} value={preview.weddingDate ?? ""} onChange={(e) => onChange({ ...preview, weddingDate: e.target.value || undefined })} className="rounded-xl" />
        {!preview.weddingDate && <p className="text-xs text-muted-foreground">No date found in the notes. Add one here or keep the current date.</p>}
      </div>
      <ul className="divide-y">
        {preview.requests.map((r) => (
          <li key={r.treatmentId} className="flex items-center justify-between py-2 text-sm">
            <span>{getTreatment(r.treatmentId).name}</span>
            <Counter
              value={r.count}
              max={getTreatment(r.treatmentId).singleSession ? 1 : 6}
              label={getTreatment(r.treatmentId).plural}
              onChange={(n) => setReq(preview.requests.map((x) => (x.treatmentId === r.treatmentId ? { ...x, count: n } : x)))}
            />
          </li>
        ))}
      </ul>
      {missing.length > 0 && (
        <select
          aria-label="Add another treatment"
          className="w-full rounded-xl border bg-card px-3 py-2 text-sm"
          value=""
          onChange={(e) => e.target.value && setReq([...preview.requests, { treatmentId: e.target.value, count: 1 }])}
        >
          <option value="">+ Add a treatment</option>
          {missing.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}
      {preview.unrecognized.length > 0 && (
        <p className="text-xs text-muted-foreground">Not understood: {preview.unrecognized.map((u) => `“${u}”`).join(", ")}</p>
      )}
      <div className="flex gap-2">
        <Button onClick={onApply} className="flex-1 rounded-full">Apply</Button>
        <Button variant="outline" onClick={onDiscard} className="flex-1 rounded-full">Discard</Button>
      </div>
    </div>
  );
}
