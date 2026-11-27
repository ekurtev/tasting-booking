import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getDays } from "@/app/api/days/route";
import { GET as getSlots } from "@/app/api/slots/route";
import { POST as postBooking } from "@/app/api/bookings/route";
import { POST as postCancel } from "@/app/api/bookings/cancel/route";
import { closePool, getPool } from "@/lib/db";
import { resetRateLimits } from "@/lib/rate-limit";
import { addDays, sofiaDate } from "@/lib/time";
import { hashToken, newToken } from "@/lib/tokens";

let typeId: number;
let consultantId: number;
let ipCounter = 0;
const nextIp = () => `198.51.100.${(ipCounter++ % 250) + 1}`;

function req(path: string, init: RequestInit & { ip?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-real-ip", init.ip ?? nextIp());
  if (init.body) headers.set("content-type", "application/json");
  return new Request(`http://test.local${path}`, { ...init, headers });
}

async function freeSlots(date: string): Promise<string[]> {
  const res = await getSlots(req(`/api/slots?consultant=${consultantId}&type=${typeId}&date=${date}`));
  return (await res.json()).slots;
}

/** First day with free slots that is at least 2 days ahead (outside the 24 h cancellation cutoff). */
async function firstFreeDay(): Promise<string> {
  const res = await getDays(req(`/api/days?consultant=${consultantId}&type=${typeId}`));
  const { days } = (await res.json()) as { days: { date: string }[] };
  const minDate = addDays(sofiaDate(new Date()), 2);
  const day = days.find((d) => d.date >= minDate);
  expect(day).toBeDefined();
  return day!.date;
}

const book = (startsAt: string, over: Record<string, unknown> = {}, ip?: string) =>
  postBooking(
    req("/api/bookings", {
      method: "POST",
      ip,
      body: JSON.stringify({
        tastingTypeId: typeId,
        consultantId,
        startsAt,
        name: "Иван Иванов",
        phone: "+359 888 123 456",
        email: "ivan@example.com",
        guests: 3,
        note: "",
        consent: true,
        ...over,
      }),
    }),
  );

const cancel = (token: string, ip?: string) =>
  postCancel(req("/api/bookings/cancel", { method: "POST", ip, body: JSON.stringify({ token }) }));

beforeAll(async () => {
  const pool = getPool();
  typeId = (await pool.query("SELECT id FROM tasting_types WHERE slug = 'personal'")).rows[0].id;
  consultantId = (await pool.query("SELECT id FROM consultants WHERE slug = 'maria-sofia'")).rows[0].id;
});

beforeEach(async () => {
  resetRateLimits();
  await getPool().query("DELETE FROM bookings");
});

afterAll(async () => {
  await closePool();
});

describe("seed", () => {
  it("contains the three tasting types and two weekday consultants", async () => {
    const pool = getPool();
    const types = await pool.query("SELECT name, duration_minutes, price_cents FROM tasting_types ORDER BY sort_order");
    expect(types.rows).toEqual([
      { name: "Офис дегустация за екип", duration_minutes: 90, price_cents: 12000 },
      { name: "Лична дегустация", duration_minutes: 45, price_cents: 2500 },
      { name: "Кутия за детски рожден ден", duration_minutes: 60, price_cents: 6000 },
    ]);
    const hours = await pool.query("SELECT DISTINCT iso_weekday FROM weekly_hours ORDER BY 1");
    expect(hours.rows.map((r) => r.iso_weekday)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("booking flow", () => {
  it("books a free slot, removes it from the free list, and the cancel link frees it again", async () => {
    const date = await firstFreeDay();
    const [slot] = await freeSlots(date);

    const res = await book(slot);
    expect(res.status).toBe(201);
    const { token } = await res.json();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    expect(await freeSlots(date)).not.toContain(slot);

    // Only the hash of the token is stored.
    const stored = await getPool().query("SELECT cancel_token_hash FROM bookings");
    expect(stored.rows[0].cancel_token_hash).toBe(hashToken(token));
    expect(stored.rows[0].cancel_token_hash).not.toContain(token);

    const c = await cancel(token);
    expect(c.status).toBe(200);
    expect(await freeSlots(date)).toContain(slot);

    // A second cancel is refused.
    expect((await cancel(token)).status).toBe(409);
  });

  it("rejects a second booking of the same slot with 409", async () => {
    const [slot] = await freeSlots(await firstFreeDay());
    expect((await book(slot)).status).toBe(201);
    const second = await book(slot);
    expect(second.status).toBe(409);
    expect((await second.json()).message).toMatch(/изберете друг/);
  });

  it("lets exactly one of many simultaneous requests for the same slot succeed", async () => {
    const [slot] = await freeSlots(await firstFreeDay());
    const results = await Promise.all(Array.from({ length: 8 }, () => book(slot)));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409, 409, 409, 409]);
    const count = await getPool().query("SELECT count(*)::int AS n FROM bookings WHERE status <> 'cancelled'");
    expect(count.rows[0].n).toBe(1);
  });

  it("also blocks an overlapping booking that starts inside another booking's buffer", async () => {
    const date = await firstFreeDay();
    const slots = await freeSlots(date);
    expect((await book(slots[0])).status).toBe(201);
    // 45 min + 15 min buffer → the next 30-minute start is blocked as well.
    const res = await book(slots[1]);
    expect(res.status).toBe(409);
  });

  it("rejects starts that are not offered (off-grid, out of hours, past)", async () => {
    const date = await firstFreeDay();
    const [slot] = await freeSlots(date);
    const offGrid = new Date(new Date(slot).getTime() + 10 * 60_000).toISOString();
    expect((await book(offGrid)).status).toBe(409);
    expect((await book("2020-01-06T08:00:00.000Z")).status).toBe(409);
  });

  it("validates the form and requires consent", async () => {
    const [slot] = await freeSlots(await firstFreeDay());
    const res = await book(slot, { consent: false, email: "nope", phone: "abc", guests: 99 });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(Object.keys(body.fieldErrors).sort()).toEqual(["consent", "email", "guests", "phone"]);
  });
});

describe("database guarantees", () => {
  it("the exclusion constraint rejects overlapping active bookings even when the app is bypassed", async () => {
    const pool = getPool();
    const insert = (start: string, end: string, status = "confirmed") =>
      pool.query(
        `INSERT INTO bookings (consultant_id, tasting_type_id, starts_at, ends_at, blocked_until, customer_name,
           customer_phone, customer_email, consent_at, cancel_token_hash, status)
         VALUES ($1, $2, $3, $4, $4, 'Тест Тестов', '+359888000000', 't@example.com', now(), $5, $6)`,
        [consultantId, typeId, start, end, hashToken(newToken()), status],
      );
    await insert("2030-01-07T08:00:00Z", "2030-01-07T09:00:00Z");
    await expect(insert("2030-01-07T08:30:00Z", "2030-01-07T09:30:00Z")).rejects.toMatchObject({ code: "23P01" });
    // Back-to-back is fine ([) ranges), and cancelled rows never block.
    await insert("2030-01-07T09:00:00Z", "2030-01-07T10:00:00Z");
    await insert("2030-01-07T08:30:00Z", "2030-01-07T09:30:00Z", "cancelled");
  });
});

describe("cancellation rules", () => {
  it("refuses online cancellation within 24 hours and returns the contact phone", async () => {
    const token = newToken();
    const soon = new Date(Date.now() + 5 * 3_600_000);
    await getPool().query(
      `INSERT INTO bookings (consultant_id, tasting_type_id, starts_at, ends_at, blocked_until, customer_name,
         customer_phone, customer_email, consent_at, cancel_token_hash)
       VALUES ($1, $2, $3, $3::timestamptz + interval '45 min', $3::timestamptz + interval '60 min',
               'Тест Тестов', '+359888000000', 't@example.com', now(), $4)`,
      [consultantId, typeId, soon, hashToken(token)],
    );
    const res = await cancel(token);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("too_late");
    expect(body.phone).toBe(process.env.CONTACT_PHONE);
  });

  it("returns 404 for unknown or malformed tokens", async () => {
    expect((await cancel(newToken())).status).toBe(404);
    expect((await cancel("short")).status).toBe(404);
  });
});

describe("rate limiting", () => {
  it("limits bookings per client IP and cannot be bypassed by a spoofed first X-Forwarded-For hop", async () => {
    const [slot] = await freeSlots(await firstFreeDay());
    const ip = "203.0.113.50";
    for (let i = 0; i < 5; i++) {
      const r = await book(slot, { email: "bad" }, ip);
      expect(r.status).toBe(400);
    }
    expect((await book(slot, {}, ip)).status).toBe(429);

    // Without X-Real-IP: the last hop counts, so rotating the first value does not help.
    resetRateLimits();
    const spoofed = (n: number) =>
      postBooking(
        new Request("http://test.local/api/bookings", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${n}, 192.0.2.9` },
          body: "{}",
        }),
      );
    for (let i = 0; i < 5; i++) expect((await spoofed(i)).status).toBe(400);
    expect((await spoofed(99)).status).toBe(429);
  });

  it("limits cancellation attempts", async () => {
    const ip = "203.0.113.60";
    for (let i = 0; i < 10; i++) expect((await cancel(newToken(), ip)).status).toBe(404);
    expect((await cancel(newToken(), ip)).status).toBe(429);
  });
});
