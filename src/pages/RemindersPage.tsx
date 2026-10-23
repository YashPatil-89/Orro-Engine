import { EmptyPlan } from "@/components/EmptyPlan";
import { ReminderList } from "@/components/ReminderList";
import { WarningBanner } from "@/components/WarningBanner";
import { useBridalStore } from "@/store/useBridalStore";

export function RemindersPage() {
  const schedule = useBridalStore((s) => s.schedule);
  if (!schedule) return <EmptyPlan title="No reminders yet" />;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Reminders</h1>
        <p className="text-sm text-muted-foreground">Every session gets a reminder the day before and two hours before, with prep tips.</p>
      </div>
      <WarningBanner tone="info" title="Demo mode">Connect Twilio/WhatsApp Business API to send for real.</WarningBanner>
      <ReminderList />
    </div>
  );
}
