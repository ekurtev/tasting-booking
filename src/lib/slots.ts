import { addDays, sofiaDate, sofiaToUtc } from "./time";

/** Start times are offered on this grid (minutes after midnight, Sofia time). */
export const SLOT_STEP_MINUTES = 30;
/** Earliest bookable start is now + this lead time. */
export const MIN_LEAD_MINUTES = 120;
/** Customers can book from today up to today + this many days (inclusive). */
export const HORIZON_DAYS = 60;

export interface WorkInterval {
  startMinutes: number;
  endMinutes: number;
}

export interface BusyRange {
  start: Date;
  /** Exclusive end — a booking's blocked_until (end + buffer). */
  end: Date;
}

export interface SlotInput {
  date: string;
  now: Date;
  /** Working intervals for this date's weekday. */
  intervals: WorkInterval[];
  isDayOff: boolean;
  durationMinutes: number;
  bufferMinutes: number;
  busy: BusyRange[];
}

export function isWithinHorizon(date: string, now: Date): boolean {
  const today = sofiaDate(now);
  return date >= today && date <= addDays(today, HORIZON_DAYS);
}

/** All free start instants on the date, sorted ascending. Pure function. */
export function computeSlots(input: SlotInput): Date[] {
  const { date, now, intervals, isDayOff, durationMinutes, bufferMinutes, busy } = input;
  if (isDayOff || !isWithinHorizon(date, now)) return [];

  const earliest = now.getTime() + MIN_LEAD_MINUTES * 60_000;
  const result = new Map<number, Date>();

  for (const { startMinutes, endMinutes } of intervals) {
    const first = Math.ceil(startMinutes / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
    for (let m = first; m + durationMinutes <= endMinutes; m += SLOT_STEP_MINUTES) {
      const start = sofiaToUtc(date, m);
      if (start.getTime() < earliest) continue;
      const blockedUntil = start.getTime() + (durationMinutes + bufferMinutes) * 60_000;
      const overlaps = busy.some((b) => start.getTime() < b.end.getTime() && b.start.getTime() < blockedUntil);
      if (!overlaps) result.set(start.getTime(), start);
    }
  }
  return [...result.values()].sort((a, b) => a.getTime() - b.getTime());
}
