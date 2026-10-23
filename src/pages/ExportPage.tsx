import { EmptyPlan } from "@/components/EmptyPlan";
import { ExportPanel } from "@/components/ExportPanel";
import { useBridalStore } from "@/store/useBridalStore";

export function ExportPage() {
  const schedule = useBridalStore((s) => s.schedule);
  if (!schedule) return <EmptyPlan title="Nothing to export yet" />;
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold">Calendar export</h1>
      <ExportPanel />
    </div>
  );
}
