// Calendar-day helpers. Every date in the app is a local calendar day stored
// as "yyyy-MM-dd" so time zones can never shift a session to the wrong day.
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";

export const toDay = (d: Date): string => format(startOfDay(d), "yyyy-MM-dd");
export const fromDay = (s: string): Date => startOfDay(parseISO(s));
export const shiftDay = (s: string, days: number): string => toDay(addDays(fromDay(s), days));
/** Number of calendar days from a to b (b - a). */
export const daysBetween = (a: string, b: string): number =>
  differenceInCalendarDays(fromDay(b), fromDay(a));
export const isSunday = (s: string): boolean => fromDay(s).getDay() === 0;
export const prettyDay = (s: string): string => format(fromDay(s), "MMM d");
export const longDay = (s: string): string => format(fromDay(s), "EEEE, MMMM d, yyyy");
export const todayDay = (): string => toDay(new Date());
