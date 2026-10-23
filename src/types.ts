export type TreatmentCategory = "intensive" | "gentle";

export interface Treatment {
  id: string;
  name: string;
  /** Plural used in plain-language messages ("Deep Skin Peels"). */
  plural: string;
  category: TreatmentCategory;
  durationMin: number;
  preferredGapDays: number;
  minGapDays: number;
  prepInstructions: string;
  aftercareInstructions: string;
  latestBeforeWeddingDays: number;
  /** How many hours before the session the prep routine should start. */
  prepLeadHours: number;
  /** Single-session treatments (Final Glow Facial). */
  singleSession?: boolean;
  description: string;
}

export type SessionStatus = "completed" | "upcoming" | "missed";

export interface Session {
  id: string;
  treatmentId: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  sequenceNumber: number;
  totalOfThisTreatment: number;
  gapFromPreviousDays: number | null;
  status: SessionStatus;
  shifted?: boolean;
  originalDate?: string;
  shiftReason?: string;
}

export interface Unplaced {
  treatmentId: string;
  count: number;
  reason: string;
}

export interface ScheduleResult {
  status: "comfortable" | "compressed" | "infeasible";
  sessions: Session[];
  warnings: string[];
  unplaced: Unplaced[];
  compressionRatio: number;
  suggestions?: string[];
}

export interface PlanRequest {
  treatmentId: string;
  count: number;
}

export type CapacityMap = Record<string, { booked: number; max: number; closed: boolean }>;

export interface ParsedNote {
  weddingDate?: string;
  requests: PlanRequest[];
  confidence: number;
  unrecognized: string[];
}

export interface ClinicConfig {
  maxAppointmentsPerDay: number;
  openHour: number; // 9
  closeHour: number; // 18
  slotMinutes: number; // 60
  rooms: number;
  specialists: number;
  sundayClosed: boolean;
}

export interface BridalPackage {
  id: string;
  name: string;
  tagline: string;
  requests: PlanRequest[];
}
