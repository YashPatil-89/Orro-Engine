import type { Treatment } from "@/types";

export const FINAL_GLOW_ID = "final-glow-facial";

export const TREATMENTS: Treatment[] = [
  {
    id: "laser-hair-therapy",
    name: "Laser Hair Therapy",
    plural: "Laser Hair Therapy sessions",
    category: "intensive",
    durationMin: 45,
    preferredGapDays: 28,
    minGapDays: 21,
    latestBeforeWeddingDays: 21,
    prepLeadHours: 72,
    description: "Long-lasting smoothness, timed with your hair growth cycle.",
    prepInstructions:
      "Shave the treatment area 24 hours before. Avoid waxing, tanning and direct sun exposure for 72 hours before this session.",
    aftercareInstructions:
      "Skip hot showers and saunas for 24 hours. Apply aloe gel if the skin feels warm and use SPF 50 daily.",
  },
  {
    id: "deep-skin-peel",
    name: "Deep Skin Peel",
    plural: "Deep Skin Peels",
    category: "intensive",
    durationMin: 60,
    preferredGapDays: 21,
    minGapDays: 14,
    latestBeforeWeddingDays: 16,
    prepLeadHours: 72,
    description: "Resurfaces texture and evens tone for a camera-ready canvas.",
    prepInstructions:
      "Avoid direct sun exposure for 48 hours before this session. No retinol or exfoliating acids for 3 days.",
    aftercareInstructions:
      "Expect light flaking for 3–5 days; do not pick. No makeup for 24 hours. Apply SPF 50 daily.",
  },
  {
    id: "acne-peel",
    name: "Acne Peel",
    plural: "Acne Peels",
    category: "intensive",
    durationMin: 45,
    preferredGapDays: 14,
    minGapDays: 10,
    latestBeforeWeddingDays: 14,
    prepLeadHours: 72,
    description: "Clears congestion and calms active breakouts.",
    prepInstructions:
      "Pause retinol and benzoyl peroxide for 3 days before. Arrive with clean skin and no makeup.",
    aftercareInstructions:
      "No makeup for 12 hours. Use a gentle cleanser only and apply SPF 50 daily.",
  },
  {
    id: "body-polishing",
    name: "Body Polishing",
    plural: "Body Polishing sessions",
    category: "gentle",
    durationMin: 60,
    preferredGapDays: 10,
    minGapDays: 7,
    latestBeforeWeddingDays: 5,
    prepLeadHours: 24,
    description: "Full-body exfoliation and hydration for luminous skin.",
    prepInstructions: "Avoid shaving or waxing for 24 hours before. Drink plenty of water the day before.",
    aftercareInstructions: "Moisturise twice daily and avoid hot baths for 12 hours.",
  },
  {
    id: "relaxation-massage",
    name: "Relaxation Massage",
    plural: "Relaxation Massages",
    category: "gentle",
    durationMin: 60,
    preferredGapDays: 7,
    minGapDays: 3,
    latestBeforeWeddingDays: 3,
    prepLeadHours: 12,
    description: "Releases wedding-planning tension and improves sleep.",
    prepInstructions: "Eat a light meal at least 2 hours before. Wear comfortable clothing.",
    aftercareInstructions: "Drink extra water today and rest if you can — no intense workouts for 12 hours.",
  },
  {
    id: "hydrating-facial",
    name: "Hydrating Facial",
    plural: "Hydrating Facials",
    category: "gentle",
    durationMin: 45,
    preferredGapDays: 14,
    minGapDays: 7,
    latestBeforeWeddingDays: 4,
    prepLeadHours: 24,
    description: "Deep moisture infusion for plump, dewy skin.",
    prepInstructions: "No retinol for 24 hours before. Arrive with clean, makeup-free skin if possible.",
    aftercareInstructions: "No makeup for 6 hours. Keep up with your moisturiser and SPF 50.",
  },
  {
    id: FINAL_GLOW_ID,
    name: "Final Glow Facial",
    plural: "Final Glow Facials",
    category: "gentle",
    durationMin: 60,
    preferredGapDays: 0,
    minGapDays: 0,
    latestBeforeWeddingDays: 2,
    prepLeadHours: 24,
    singleSession: true,
    description: "Your signature pre-wedding radiance ritual, exactly two days before.",
    prepInstructions: "Get a full night's sleep and avoid alcohol the night before. No new skincare products.",
    aftercareInstructions: "Skip makeup until the morning of your wedding. Sleep on a clean silk pillowcase.",
  },
];

const BY_ID = new Map(TREATMENTS.map((t) => [t.id, t]));

export function getTreatment(id: string): Treatment {
  const t = BY_ID.get(id);
  if (!t) throw new Error(`Unknown treatment: ${id}`);
  return t;
}
