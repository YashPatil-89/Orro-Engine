import { createFileRoute } from "@tanstack/react-router";
import { ClinicPage } from "@/pages/ClinicPage";

export const Route = createFileRoute("/clinic")({
  head: () => ({
    meta: [
      { title: "Clinic Capacity · ORRO Wellness" },
      { name: "description", content: "Staff view of daily appointment capacity and bridal session shifts." },
      { property: "og:title", content: "Clinic Capacity · ORRO Wellness" },
      { property: "og:description", content: "Staff view of daily appointment capacity and bridal session shifts." },
    ],
  }),
  component: ClinicPage,
});
