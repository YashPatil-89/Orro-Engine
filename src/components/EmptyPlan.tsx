import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useBridalStore } from "@/store/useBridalStore";

export function EmptyPlan({ title = "No countdown yet" }: { title?: string }) {
  const role = useBridalStore((s) => s.role);
  if (role === "client")
    return (
      <div className="animate-rise rounded-3xl border bg-soft p-8 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-gold" aria-hidden />
        <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your ORRO specialist will share your plan after your consultation.</p>
      </div>
    );
  return (
    <div className="animate-rise rounded-3xl border bg-soft p-8 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-gold" aria-hidden />
      <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Create a plan first, or load a demo scenario from the settings menu.</p>
      <Link to="/" className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        Start planning
      </Link>
    </div>
  );
}
