import { createFileRoute } from "@tanstack/react-router";
import { ExportPage } from "@/pages/ExportPage";

export const Route = createFileRoute("/export")({
  head: () => ({
    meta: [
      { title: "Calendar Export · ORRO Wellness" },
      { name: "description", content: "Download your bridal sessions as a calendar file with built-in reminders." },
      { property: "og:title", content: "Calendar Export · ORRO Wellness" },
      { property: "og:description", content: "Download your bridal sessions as a calendar file with built-in reminders." },
    ],
  }),
  component: ExportPage,
});
