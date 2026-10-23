import type { BridalPackage } from "@/types";

export const PACKAGES: BridalPackage[] = [
  {
    id: "classic",
    name: "Classic Bride",
    tagline: "Hydration, polish and one resurfacing peel.",
    requests: [
      { treatmentId: "hydrating-facial", count: 2 },
      { treatmentId: "body-polishing", count: 2 },
      { treatmentId: "deep-skin-peel", count: 1 },
      { treatmentId: "final-glow-facial", count: 1 },
    ],
  },
  {
    id: "radiance",
    name: "Radiance Bride",
    tagline: "A clear-skin journey for blemish-prone brides.",
    requests: [
      { treatmentId: "acne-peel", count: 3 },
      { treatmentId: "hydrating-facial", count: 2 },
      { treatmentId: "body-polishing", count: 2 },
      { treatmentId: "final-glow-facial", count: 1 },
    ],
  },
  {
    id: "complete",
    name: "Complete Bridal Transformation",
    tagline: "Our full head-to-toe programme. Best booked 3+ months ahead.",
    requests: [
      { treatmentId: "laser-hair-therapy", count: 3 },
      { treatmentId: "deep-skin-peel", count: 2 },
      { treatmentId: "body-polishing", count: 3 },
      { treatmentId: "relaxation-massage", count: 3 },
      { treatmentId: "hydrating-facial", count: 3 },
      { treatmentId: "final-glow-facial", count: 1 },
    ],
  },
];
