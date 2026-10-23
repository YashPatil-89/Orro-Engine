import { createFileRoute } from "@tanstack/react-router";
import { RemindersPage } from "@/pages/RemindersPage";

export const Route = createFileRoute("/reminders")({
  head: () => ({
    meta: [
      { title: "Session Reminders · ORRO Wellness" },
      { name: "description", content: "WhatsApp and SMS reminders 24 hours and 2 hours before each bridal session." },
      { property: "og:title", content: "Session Reminders · ORRO Wellness" },
      { property: "og:description", content: "WhatsApp and SMS reminders 24 hours and 2 hours before each bridal session." },
    ],
  }),
  component: RemindersPage,
});
