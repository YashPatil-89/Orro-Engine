import { createFileRoute } from "@tanstack/react-router";
import { PlanBuilder } from "@/components/PlanBuilder";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plan Your Bridal Countdown · ORRO Wellness" },
      { name: "description", content: "Build a safe, backward-planned bridal beauty schedule from your wedding date." },
      { property: "og:title", content: "Plan Your Bridal Countdown · ORRO Wellness" },
      { property: "og:description", content: "Build a safe, backward-planned bridal beauty schedule from your wedding date." },
    ],
  }),
  component: PlanBuilder,
});
