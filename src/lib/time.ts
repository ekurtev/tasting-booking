import { TZDate } from "@date-fns/tz";

export const TIME_ZONE = "Europe/Sofia";

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates a 'YYYY-MM-DD' calendar date string. */
export function isValidDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Calendar date in Sofia for the given instant, as 'YYYY-MM-DD'. */
export function sofiaDate(instant: Date): string {
  return ymdFormatter.format(instant);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** ISO weekday (1 = Monday … 7 = Sunday) of a calendar date. */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

/** The UTC instant of a Sofia wall-clock time (minutes after midnight) on a date. DST-aware. */
export function sofiaToUtc(date: string, minutes: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  const tz = new TZDate(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, TIME_ZONE);
  return new Date(tz.getTime());
}

/** Parses a Postgres TIME value ('09:00' or '09:00:00') into minutes after midnight. */
export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

const timeFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("bg-BG", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const formatTime = (d: Date) => timeFmt.format(d);
export const formatDateLong = (d: Date) => dateFmt.format(d);
