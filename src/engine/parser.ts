// =============================================================================
// Consultation-note parser.
//
// Reads free-text notes like "Bride wants 3 acne peel sessions and 2 body
// polishing treatments, wedding 12th Dec" and extracts the wedding date and
// treatment counts. It is rule-based (no API) and sits behind the NoteParser
// interface so an AI-powered parser can replace it later without UI changes.
// =============================================================================
import type { ParsedNote, PlanRequest } from "@/types";
import { addDays, addMonths, addWeeks, isValid } from "date-fns";
import { fromDay, toDay } from "./dates";

export interface NoteParser {
  parse(text: string, today: string): ParsedNote;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, single: 1, once: 1, two: 2, twice: 2, couple: 2, pair: 2, three: 3, thrice: 3,
  four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
const NUM = "(\\d{1,2}|a|an|one|single|two|couple(?: of)?|pair(?: of)?|three|four|five|six|seven|eight|nine|ten|eleven|twelve)";

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};
const MONTH_RE = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

// Most specific synonyms first so "glow facial" is not read as a generic facial.
const SYNONYMS: { id: string; re: string }[] = [
  { id: "final-glow-facial", re: "(?:final\\s+)?glow\\s+facials?|final\\s+(?:glow|facial)" },
  { id: "hydrating-facial", re: "hydrat(?:ing|ion)\\s+facials?|hydra\\s*facials?|hydrating" },
  { id: "deep-skin-peel", re: "deep\\s+(?:skin\\s+)?peels?|chemical\\s+peels?" },
  { id: "acne-peel", re: "acne\\s+peels?|acne\\s+(?:treatments?|sessions?)" },
  { id: "laser-hair-therapy", re: "laser(?:\\s+hair)?(?:\\s+(?:removal|therapy|treatments?|sessions?))?|hair\\s+removal" },
  { id: "body-polishing", re: "body\\s+polish(?:ing|es)?|polish(?:ing|es)?" },
  { id: "relaxation-massage", re: "(?:relaxation\\s+|relaxing\\s+)?massages?" },
  { id: "acne-peel", re: "peel(?:s)?(?:\\s+sessions?)?" },
  { id: "hydrating-facial", re: "facials?" },
];

const FILLER = new Set(
  "the a an and or with also she her bride client wants want needs need would like to for of in on at is be plus wedding sessions session treatments treatment some please booked book has have prior before after".split(" "),
);

function toNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const w = raw.trim().split(/\s+/)[0];
  if (/^\d+$/.test(w)) return parseInt(w, 10);
  return NUMBER_WORDS[w];
}

function nextOccurrence(month: number, day: number, today: Date, year?: number): Date | undefined {
  if (day < 1 || day > 31) return undefined;
  let d = new Date(year ?? today.getFullYear(), month, day);
  if (!isValid(d) || d.getDate() !== day) return undefined;
  if (year === undefined && d <= today) d = new Date(today.getFullYear() + 1, month, day);
  return d;
}

function parseDate(text: string, today: string): { date?: string; span?: string } {
  const now = fromDay(today);
  let m = text.match(new RegExp(`in\\s+${NUM}\\s+(days?|weeks?|months?)`));
  if (m) {
    const n = toNumber(m[1]) ?? 0;
    const unit = m[2];
    const d = unit.startsWith("day") ? addDays(now, n) : unit.startsWith("week") ? addWeeks(now, n) : addMonths(now, n);
    return { date: toDay(d), span: m[0] };
  }
  m = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/);
  if (m) {
    let a = +m[1];
    let b = +m[2];
    if (b > 12 && a <= 12) [a, b] = [b, a]; // US style mm/dd
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    const d = nextOccurrence(b - 1, a, now, y);
    if (d) return { date: toDay(d), span: m[0] };
  }
  m = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RE}\\.?(?:,?\\s+(\\d{4}))?`));
  if (m) {
    const d = nextOccurrence(MONTHS[m[2].slice(0, m[2].startsWith("sept") ? 4 : 3)], +m[1], now, m[3] ? +m[3] : undefined);
    if (d) return { date: toDay(d), span: m[0] };
  }
  m = text.match(new RegExp(`\\b${MONTH_RE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?`));
  if (m) {
    const d = nextOccurrence(MONTHS[m[1].slice(0, m[1].startsWith("sept") ? 4 : 3)], +m[2], now, m[3] ? +m[3] : undefined);
    if (d) return { date: toDay(d), span: m[0] };
  }
  return {};
}

export function parseConsultationNote(input: string, today: string): ParsedNote {
  let text = ` ${input.toLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ")} `;
  const { date, span } = parseDate(text, today);
  if (span) text = text.replace(span, " ; ");

  const counts = new Map<string, number>();
  for (const syn of SYNONYMS) {
    const re = new RegExp(`(?:\\b${NUM}\\s+(?:x\\s+)?(?:(?:more|extra|additional|sessions? of|rounds? of)\\s+)?)?\\b(?:${syn.re})\\b(?:\\s*(?:x\\s*|×\\s*)(\\d{1,2}))?`, "g");
    text = text.replace(re, (_match, before?: string, after?: string) => {
      const n = toNumber(before) ?? toNumber(after) ?? 1;
      counts.set(syn.id, Math.max(counts.get(syn.id) ?? 0, n));
      return " ; ";
    });
  }
  const requests: PlanRequest[] = [...counts.entries()].map(([treatmentId, count]) => ({
    treatmentId,
    count: treatmentId === "final-glow-facial" ? 1 : Math.min(count, 12),
  }));

  const unrecognized = text
    .split(/[;,.\n!?]|\band\b|\bplus\b/)
    .map((f) => f.trim())
    .filter((f) => f.split(/\s+/).some((w) => w.length > 2 && !FILLER.has(w) && !/^\d+$/.test(w) && !NUMBER_WORDS[w]));

  const total = requests.length + unrecognized.length;
  let confidence = 0;
  if (requests.length) confidence += 0.5;
  if (date) confidence += 0.3;
  if (total) confidence += 0.2 * (requests.length / total);
  return { weddingDate: date, requests, confidence: Math.round(confidence * 100) / 100, unrecognized };
}

export const ruleBasedParser: NoteParser = { parse: parseConsultationNote };
