import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as getDays } from "@/app/api/days/route";
import { GET as getSlots } from "@/app/api/slots/route";
import { closePool, getPool } from "@/lib/db";
import { addDays, isoWeekday, sofiaDate } from "@/lib/time";

// Correction #4: days without working hours (weekends by the weekly schedule) and days off must never
// look bookable. A dedicated consultant keeps this independent of other tests' schedule changes.
let consultantId: number;
let typeId: number;
let dayOff: string;

const req = (path: string) => new Request(`http://test.local${path}`, { headers: { "x-real-ip": "203.0.113.7" } });

async function slots(date: string): Promise<string[]> {
  const res = await getSlots(req(`/api/slots?consultant=${consultantId}&type=${typeId}&date=${date}`));
  expect(res.status).toBe(200);
  return (await res.json()).slots;
}

async function calendarDays(): Promise<string[]> {
  const res = await getDays(req(`/api/days?consultant=${consultantId}&type=${typeId}`));
  return ((await res.json()).days as { date: string }[]).map((d) => d.date);
}

/** First date ≥ 3 days ahead with the given ISO weekday. */
function next(weekday: number): string {
  let d = addDays(sofiaDate(new Date()), 3);
  while (isoWeekday(d) !== weekday) d = addDays(d, 1);
  return d;
}

beforeAll(async () => {
  const pool = getPool();
  typeId = (await pool.query("SELECT id FROM tasting_types WHERE slug = 'personal'")).rows[0].id;
  const loc = (await pool.query("SELECT id FROM locations WHERE slug = 'sofia'")).rows[0].id;
  consultantId = (
    await pool.query(
      "INSERT INTO consultants (slug, name, location_id, buffer_minutes) VALUES ('calendar-test', 'Тест Календар', $1, 15) RETURNING id",
      [loc],
    )
  ).rows[0].id;
  await pool.query(
    `INSERT INTO weekly_hours (consultant_id, iso_weekday, start_time, end_time)
     SELECT $1, d, '09:00', '18:00' FROM generate_series(1, 5) d`,
    [consultantId],
  );
  dayOff = next(3); // a Wednesday
  await pool.query("INSERT INTO days_off (consultant_id, day, note) VALUES ($1, $2, 'отпуск')", [consultantId, dayOff]);
});

afterAll(async () => {
  await getPool().query("DELETE FROM consultants WHERE id = $1", [consultantId]);
  await closePool();
});

describe("non-working days are never bookable", () => {
  it("returns no slots on Saturday and Sunday when the weekly schedule has no hours", async () => {
    expect(await slots(next(6))).toEqual([]);
    expect(await slots(next(7))).toEqual([]);
  });

  it("returns no slots on a day off, but does on a normal working day", async () => {
    expect(await slots(dayOff)).toEqual([]);
    expect((await slots(next(2))).length).toBeGreaterThan(0);
  });

  it("leaves weekends and days off out of the calendar", async () => {
    const days = await calendarDays();
    expect(days.length).toBeGreaterThan(0);
    expect(days.some((d) => isoWeekday(d) >= 6)).toBe(false);
    expect(days).not.toContain(dayOff);
    expect(days).toContain(next(2));
  });
});
