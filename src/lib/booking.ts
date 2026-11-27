import { z } from "zod";
import { EXCLUSION_VIOLATION, getPool, pgErrorCode } from "./db";
import { computeSlots, HORIZON_DAYS, isWithinHorizon, type BusyRange, type WorkInterval } from "./slots";
import { addDays, isoWeekday, isValidDate, sofiaDate, sofiaToUtc, timeToMinutes } from "./time";
import { hashToken, isWellFormedToken, newToken } from "./tokens";

/** Cancellation via the personal link is allowed only this long before the start. */
export const CANCEL_CUTOFF_HOURS = 24;

export interface TastingType {
  id: number;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
}

export interface Consultant {
  id: number;
  name: string;
  bufferMinutes: number;
  city: string;
  locationName: string;
  address: string;
}

export interface Location {
  id: number;
  slug: string;
  city: string;
  name: string;
  address: string;
}

export async function listActiveTypes(): Promise<TastingType[]> {
  const { rows } = await getPool().query(
    `SELECT id, name, description, duration_minutes, price_cents
       FROM tasting_types WHERE active ORDER BY sort_order, id`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    durationMinutes: r.duration_minutes,
    priceCents: r.price_cents,
  }));
}

export async function listActiveConsultants(): Promise<Consultant[]> {
  const { rows } = await getPool().query(
    `SELECT c.id, c.name, c.buffer_minutes, l.slug AS location_slug, l.city, l.name AS location_name, l.address
       FROM consultants c JOIN locations l ON l.id = c.location_id
      WHERE c.active ORDER BY l.sort_order, c.sort_order, c.id`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    bufferMinutes: r.buffer_minutes,
    city: r.city,
    locationName: r.location_name,
    address: r.address,
  }));
}

export async function listLocations(): Promise<Location[]> {
  const { rows } = await getPool().query(`SELECT id, slug, city, name, address FROM locations ORDER BY sort_order, id`);
  return rows;
}

async function getActiveType(id: number): Promise<TastingType | null> {
  return (await listActiveTypes()).find((t) => t.id === id) ?? null;
}

async function getActiveConsultant(id: number): Promise<Consultant | null> {
  return (await listActiveConsultants()).find((c) => c.id === id) ?? null;
}

interface Schedule {
  hoursByWeekday: Map<number, WorkInterval[]>;
  daysOff: Set<string>;
  busy: BusyRange[];
}

async function loadSchedule(consultantId: number, fromDate: string, toDate: string): Promise<Schedule> {
  const pool = getPool();
  const rangeStart = sofiaToUtc(fromDate, 0);
  const rangeEnd = sofiaToUtc(addDays(toDate, 1), 0);
  const [hours, off, busy] = await Promise.all([
    pool.query(
      `SELECT iso_weekday, start_time::text AS start_time, end_time::text AS end_time
         FROM weekly_hours WHERE consultant_id = $1`,
      [consultantId],
    ),
    pool.query(`SELECT day FROM days_off WHERE consultant_id = $1 AND day BETWEEN $2 AND $3`, [
      consultantId,
      fromDate,
      toDate,
    ]),
    pool.query(
      `SELECT starts_at, blocked_until FROM bookings
        WHERE consultant_id = $1 AND status <> 'cancelled'
          AND starts_at < $3 AND blocked_until > $2`,
      [consultantId, rangeStart, rangeEnd],
    ),
  ]);
  const hoursByWeekday = new Map<number, WorkInterval[]>();
  for (const r of hours.rows) {
    const list = hoursByWeekday.get(r.iso_weekday) ?? [];
    list.push({ startMinutes: timeToMinutes(r.start_time), endMinutes: timeToMinutes(r.end_time) });
    hoursByWeekday.set(r.iso_weekday, list);
  }
  return {
    hoursByWeekday,
    daysOff: new Set(off.rows.map((r) => r.day as string)),
    busy: busy.rows.map((r) => ({ start: r.starts_at, end: r.blocked_until })),
  };
}

function slotsFor(date: string, now: Date, schedule: Schedule, type: TastingType, consultant: Consultant) {
  return computeSlots({
    date,
    now,
    intervals: schedule.hoursByWeekday.get(isoWeekday(date)) ?? [],
    isDayOff: schedule.daysOff.has(date),
    durationMinutes: type.durationMinutes,
    bufferMinutes: consultant.bufferMinutes,
    busy: schedule.busy,
  });
}

export async function availableSlots(consultantId: number, typeId: number, date: string, now = new Date()) {
  if (!isValidDate(date) || !isWithinHorizon(date, now)) return null;
  const [type, consultant] = await Promise.all([getActiveType(typeId), getActiveConsultant(consultantId)]);
  if (!type || !consultant) return null;
  const schedule = await loadSchedule(consultantId, date, date);
  return slotsFor(date, now, schedule, type, consultant);
}

/** Dates (today … today + horizon) that have at least one free slot. */
export async function availableDays(consultantId: number, typeId: number, now = new Date()) {
  const [type, consultant] = await Promise.all([getActiveType(typeId), getActiveConsultant(consultantId)]);
  if (!type || !consultant) return null;
  const today = sofiaDate(now);
  const last = addDays(today, HORIZON_DAYS);
  const schedule = await loadSchedule(consultantId, today, last);
  const days: { date: string; slots: number }[] = [];
  for (let d = today; d <= last; d = addDays(d, 1)) {
    const count = slotsFor(d, now, schedule, type, consultant).length;
    if (count > 0) days.push({ date: d, slots: count });
  }
  return days;
}

const PHONE_RE = /^\+?[0-9][0-9 ()/-]{5,24}$/;

export const bookingInputSchema = z.object({
  tastingTypeId: z.coerce.number().int().positive(),
  consultantId: z.coerce.number().int().positive(),
  startsAt: z.iso.datetime({ offset: true }),
  name: z.string().trim().min(2, "Моля, въведете име.").max(100),
  phone: z.string().trim().regex(PHONE_RE, "Моля, въведете валиден телефон."),
  email: z.string().trim().max(254).pipe(z.email("Моля, въведете валиден имейл.")),
  guests: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(1, "Броят гости е от 1 до 50.").max(50, "Броят гости е от 1 до 50.").optional(),
  ),
  note: z.string().trim().max(1000, "Бележката е твърде дълга.").optional().or(z.literal("")),
  consent: z.literal(true, "Моля, потвърдете, че сте се запознали с Общите условия и Политиката за поверителност."),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

export type CreateBookingResult =
  | { ok: true; token: string; bookingId: string }
  | { ok: false; reason: "invalid_type_or_consultant" | "slot_unavailable" | "slot_taken" };

export async function createBooking(input: BookingInput, now = new Date()): Promise<CreateBookingResult> {
  const [type, consultant] = await Promise.all([
    getActiveType(input.tastingTypeId),
    getActiveConsultant(input.consultantId),
  ]);
  if (!type || !consultant) return { ok: false, reason: "invalid_type_or_consultant" };

  const start = new Date(input.startsAt);
  const date = sofiaDate(start);
  // Re-validate on the server: the start must be one of the currently offered free slots.
  const schedule = await loadSchedule(consultant.id, date, date);
  const offered = slotsFor(date, now, schedule, type, consultant).some((s) => s.getTime() === start.getTime());
  if (!offered) return { ok: false, reason: "slot_unavailable" };

  const end = new Date(start.getTime() + type.durationMinutes * 60_000);
  const blockedUntil = new Date(end.getTime() + consultant.bufferMinutes * 60_000);
  const token = newToken();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    // Serialize concurrent inserts for one consultant. Without this, racing inserts that collide on
    // the exclusion constraint can deadlock each other; with it, the loser gets a clean 23P01.
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [BOOKING_LOCK_NAMESPACE, consultant.id]);
    const { rows } = await client.query(
      `INSERT INTO bookings (consultant_id, tasting_type_id, starts_at, ends_at, blocked_until,
                             customer_name, customer_phone, customer_email, guests, note,
                             consent_at, cancel_token_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), $11)
       RETURNING id`,
      [
        consultant.id,
        type.id,
        start,
        end,
        blockedUntil,
        input.name,
        input.phone,
        input.email,
        input.guests ?? null,
        input.note || null,
        hashToken(token),
      ],
    );
    await client.query("COMMIT");
    return { ok: true, token, bookingId: rows[0].id };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    // The exclusion constraint is the final word when two requests race for the same slot.
    if (pgErrorCode(err) === EXCLUSION_VIOLATION) return { ok: false, reason: "slot_taken" };
    throw err;
  } finally {
    client.release();
  }
}

/** First key of the two-key advisory lock used for booking inserts (second key = consultant id). */
const BOOKING_LOCK_NAMESPACE = 4201;

export interface BookingDetails {
  id: string;
  status: "confirmed" | "completed" | "no_show" | "cancelled";
  startsAt: Date;
  endsAt: Date;
  typeName: string;
  priceCents: number;
  consultantName: string;
  city: string;
  locationSlug: string;
  locationName: string;
  address: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  guests: number | null;
  note: string | null;
  canCancel: boolean;
}

export async function getBookingByToken(token: string, now = new Date()): Promise<BookingDetails | null> {
  if (!isWellFormedToken(token)) return null;
  const { rows } = await getPool().query(
    `SELECT b.id, b.status, b.starts_at, b.ends_at, b.customer_name, b.customer_phone, b.customer_email,
            b.guests, b.note, t.name AS type_name, t.price_cents, c.name AS consultant_name,
            l.slug AS location_slug, l.city, l.name AS location_name, l.address
       FROM bookings b
       JOIN tasting_types t ON t.id = b.tasting_type_id
       JOIN consultants c ON c.id = b.consultant_id
       JOIN locations l ON l.id = c.location_id
      WHERE b.cancel_token_hash = $1`,
    [hashToken(token)],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    status: r.status,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    typeName: r.type_name,
    priceCents: r.price_cents,
    consultantName: r.consultant_name,
    city: r.city,
    locationSlug: r.location_slug,
    locationName: r.location_name,
    address: r.address,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    guests: r.guests,
    note: r.note,
    canCancel: r.status === "confirmed" && isBeforeCutoff(r.starts_at, now),
  };
}

export function isBeforeCutoff(startsAt: Date, now: Date): boolean {
  return startsAt.getTime() - now.getTime() >= CANCEL_CUTOFF_HOURS * 3_600_000;
}

export type CancelResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "not_cancellable" | "too_late" };

export async function cancelBookingByToken(token: string, now = new Date()): Promise<CancelResult> {
  if (!isWellFormedToken(token)) return { ok: false, reason: "not_found" };
  const { rows } = await getPool().query(
    `UPDATE bookings SET status = 'cancelled', cancelled_at = now()
      WHERE cancel_token_hash = $1 AND status = 'confirmed'
        AND starts_at - $2::timestamptz >= make_interval(hours => $3)
      RETURNING id`,
    [hashToken(token), now, CANCEL_CUTOFF_HOURS],
  );
  if (rows.length) return { ok: true };
  const existing = await getBookingByToken(token, now);
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.status !== "confirmed") return { ok: false, reason: "not_cancellable" };
  return { ok: false, reason: "too_late" };
}
