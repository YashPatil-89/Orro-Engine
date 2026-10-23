import { createFileRoute } from "@tanstack/react-router";
import { TimelinePage } from "@/pages/TimelinePage";

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Your Bridal Timeline · ORRO Wellness" },
      { name: "description", content: "Every treatment, rest period and prep tip between today and your wedding." },
      { property: "og:title", content: "Your Bridal Timeline · ORRO Wellness" },
      { property: "og:description", content: "Every treatment, rest period and prep tip between today and your wedding." },
    ],
  }),
  component: TimelinePage,
});
