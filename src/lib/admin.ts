import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getPool } from "./db";
import { addDays, isValidDate, minutesToTime, sofiaDate, sofiaToUtc, timeToMinutes } from "./time";

export type BookingStatus = "confirmed" | "completed" | "no_show" | "cancelled";

export interface AdminBooking {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  typeName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  guests: number | null;
  note: string | null;
}

/** Bookings of one consultant on one Sofia calendar day, all statuses. */
export async function listBookingsForDay(consultantId: number, date: string): Promise<AdminBooking[]> {
  const { rows } = await getPool().query(
    `SELECT b.id, b.starts_at, b.ends_at, b.status, t.name AS type_name, b.customer_name, b.customer_phone,
            b.customer_email, b.guests, b.note
       FROM bookings b JOIN tasting_types t ON t.id = b.tasting_type_id
      WHERE b.consultant_id = $1 AND b.starts_at >= $2 AND b.starts_at < $3
      ORDER BY b.starts_at, b.created_at`,
    [consultantId, sofiaToUtc(date, 0), sofiaToUtc(addDays(date, 1), 0)],
  );
  return rows.map((r) => ({
    id: r.id,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    status: r.status,
    typeName: r.type_name,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    guests: r.guests,
    note: r.note,
  }));
}

export const statusSchema = z.object({ status: z.enum(["completed", "no_show", "cancelled"]) });

/** Allowed transitions: confirmed → completed | no_show | cancelled. */
export async function updateBookingStatus(
  id: string,
  status: "completed" | "no_show" | "cancelled",
): Promise<"ok" | "not_found" | "invalid_transition"> {
  if (!z.uuid().safeParse(id).success) return "not_found";
  const pool = getPool();
  const res = await pool.query(
    `UPDATE bookings SET status = $2::booking_status,
            cancelled_at = CASE WHEN $2::booking_status = 'cancelled' THEN now() ELSE cancelled_at END
      WHERE id = $1 AND status = 'confirmed'`,
    [id, status],
  );
  if (res.rowCount) return "ok";
  const exists = await pool.query("SELECT 1 FROM bookings WHERE id = $1", [id]);
  return exists.rowCount ? "invalid_transition" : "not_found";
}

// ---------- tasting types ----------

export interface AdminTastingType {
  id: number;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
}

export const tastingTypeSchema = z.object({
  name: z.string().trim().min(1, "Името е задължително.").max(200),
  description: z.string().trim().max(2000).default(""),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(15, "Продължителността е от 15 до 480 минути.")
    .max(480, "Продължителността е от 15 до 480 минути."),
  priceCents: z.coerce.number().int().min(0, "Цената не може да е отрицателна.").max(10_000_000),
  active: z.boolean().default(true),
});
export type TastingTypeInput = z.infer<typeof tastingTypeSchema>;

export async function listAllTypes(): Promise<AdminTastingType[]> {
  const { rows } = await getPool().query(
    `SELECT id, name, description, duration_minutes, price_cents, active
       FROM tasting_types ORDER BY active DESC, sort_order, id`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    durationMinutes: r.duration_minutes,
    priceCents: r.price_cents,
    active: r.active,
  }));
}

export async function createType(input: TastingTypeInput): Promise<number> {
  const { rows } = await getPool().query(
    `INSERT INTO tasting_types (slug, name, description, duration_minutes, price_cents, active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, (SELECT coalesce(max(sort_order), 0) + 1 FROM tasting_types))
     RETURNING id`,
    [
      `type-${randomBytes(6).toString("hex")}`,
      input.name,
      input.description,
      input.durationMinutes,
      input.priceCents,
      input.active,
    ],
  );
  return rows[0].id;
}

export async function updateType(id: number, input: TastingTypeInput): Promise<boolean> {
  const res = await getPool().query(
    `UPDATE tasting_types SET name = $2, description = $3, duration_minutes = $4, price_cents = $5, active = $6
      WHERE id = $1`,
    [id, input.name, input.description, input.durationMinutes, input.priceCents, input.active],
  );
  return res.rowCount === 1;
}

// ---------- consultants, weekly hours, days off ----------

export interface AdminConsultant {
  id: number;
  name: string;
  city: string;
  bufferMinutes: number;
  active: boolean;
}

export async function listConsultants(): Promise<AdminConsultant[]> {
  const { rows } = await getPool().query(
    `SELECT c.id, c.name, l.city, c.buffer_minutes, c.active
       FROM consultants c JOIN locations l ON l.id = c.location_id
      ORDER BY l.sort_order, c.sort_order, c.id`,
  );
  return rows.map((r) => ({ id: r.id, name: r.name, city: r.city, bufferMinutes: r.buffer_minutes, active: r.active }));
}

export interface WeeklyInterval {
  isoWeekday: number;
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface ConsultantSchedule {
  consultant: AdminConsultant;
  hours: WeeklyInterval[];
  daysOff: { day: string; note: string }[];
}

export async function getSchedule(consultantId: number): Promise<ConsultantSchedule | null> {
  const consultant = (await listConsultants()).find((c) => c.id === consultantId);
  if (!consultant) return null;
  const pool = getPool();
  const [hours, off] = await Promise.all([
    pool.query(
      `SELECT iso_weekday, start_time::text AS start_time, end_time::text AS end_time
         FROM weekly_hours WHERE consultant_id = $1 ORDER BY iso_weekday, start_time`,
      [consultantId],
    ),
    pool.query(`SELECT day, note FROM days_off WHERE consultant_id = $1 AND day >= $2 ORDER BY day`, [
      consultantId,
      sofiaDate(new Date()),
    ]),
  ]);
  return {
    consultant,
    hours: hours.rows.map((r) => ({
      isoWeekday: r.iso_weekday,
      start: minutesToTime(timeToMinutes(r.start_time)),
      end: minutesToTime(timeToMinutes(r.end_time)),
    })),
    daysOff: off.rows,
  };
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const scheduleSchema = z
  .object({
    bufferMinutes: z.coerce.number().int().min(0, "Буферът е от 0 до 240 минути.").max(240, "Буферът е от 0 до 240 минути."),
    hours: z
      .array(
        z.object({
          isoWeekday: z.number().int().min(1).max(7),
          start: z.string().regex(HHMM, "Часът трябва да е във формат ЧЧ:ММ."),
          end: z.string().regex(HHMM, "Часът трябва да е във формат ЧЧ:ММ."),
        }),
      )
      .max(70),
  })
  .superRefine((value, ctx) => {
    for (let wd = 1; wd <= 7; wd++) {
      const day = value.hours
        .filter((h) => h.isoWeekday === wd)
        .map((h) => ({ s: timeToMinutes(h.start), e: timeToMinutes(h.end) }))
        .sort((a, b) => a.s - b.s);
      for (let i = 0; i < day.length; i++) {
        if (day[i].e <= day[i].s) {
          ctx.addIssue({ code: "custom", message: "Краят трябва да е след началото.", path: ["hours"] });
          return;
        }
        if (i > 0 && day[i].s < day[i - 1].e) {
          ctx.addIssue({ code: "custom", message: "Интервалите в един ден се застъпват.", path: ["hours"] });
          return;
        }
      }
    }
  });
export type ScheduleInput = z.infer<typeof scheduleSchema>;

/** Replaces the weekly hours and buffer of a consultant. Existing bookings are not touched. */
export async function saveSchedule(consultantId: number, input: ScheduleInput): Promise<boolean> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const res = await client.query("UPDATE consultants SET buffer_minutes = $2 WHERE id = $1", [
      consultantId,
      input.bufferMinutes,
    ]);
    if (res.rowCount !== 1) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query("DELETE FROM weekly_hours WHERE consultant_id = $1", [consultantId]);
    for (const h of input.hours) {
      await client.query(
        "INSERT INTO weekly_hours (consultant_id, iso_weekday, start_time, end_time) VALUES ($1, $2, $3, $4)",
        [consultantId, h.isoWeekday, h.start, h.end],
      );
    }
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export const dayOffSchema = z.object({
  day: z.string().refine(isValidDate, "Невалидна дата."),
  note: z.string().trim().max(200).default(""),
});

export async function addDayOff(consultantId: number, day: string, note: string): Promise<boolean> {
  const res = await getPool().query(
    `INSERT INTO days_off (consultant_id, day, note)
     SELECT id, $2, $3 FROM consultants WHERE id = $1
     ON CONFLICT (consultant_id, day) DO UPDATE SET note = EXCLUDED.note`,
    [consultantId, day, note],
  );
  return res.rowCount === 1;
}

export async function removeDayOff(consultantId: number, day: string): Promise<boolean> {
  if (!isValidDate(day)) return false;
  const res = await getPool().query("DELETE FROM days_off WHERE consultant_id = $1 AND day = $2", [consultantId, day]);
  return res.rowCount === 1;
}

/** Number of active bookings on a day — shown as a warning when a day off is added. */
export async function activeBookingsOnDay(consultantId: number, day: string): Promise<number> {
  const { rows } = await getPool().query(
    `SELECT count(*)::int AS n FROM bookings
      WHERE consultant_id = $1 AND status = 'confirmed' AND starts_at >= $2 AND starts_at < $3`,
    [consultantId, sofiaToUtc(day, 0), sofiaToUtc(addDays(day, 1), 0)],
  );
  return rows[0].n;
}
