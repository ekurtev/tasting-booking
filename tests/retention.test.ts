import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closePool, getPool } from "@/lib/db";
import { getBookingByToken } from "@/lib/booking";
import { anonymizeExpiredBookings } from "@/lib/retention";
import { hashToken, newToken } from "@/lib/tokens";

let typeId: number;
let consultantId: number;

beforeAll(async () => {
  const pool = getPool();
  typeId = (await pool.query("SELECT id FROM tasting_types ORDER BY id LIMIT 1")).rows[0].id;
  consultantId = (await pool.query("SELECT id FROM consultants ORDER BY id LIMIT 1")).rows[0].id;
});

afterAll(async () => {
  await closePool();
});

async function insertBooking(startsAt: Date, status = "completed") {
  const token = newToken();
  const { rows } = await getPool().query(
    `INSERT INTO bookings (consultant_id, tasting_type_id, starts_at, ends_at, blocked_until, customer_name,
       customer_phone, customer_email, note, consent_at, cancel_token_hash, status)
     VALUES ($1, $2, $3, $3::timestamptz + interval '45 min', $3::timestamptz + interval '60 min',
             'Петя Петрова', '+359888111222', 'petya@example.com', 'бележка', now(), $4, $5)
     RETURNING id`,
    [consultantId, typeId, startsAt, hashToken(token), status],
  );
  return { id: rows[0].id as string, token };
}

const row = async (id: string) =>
  (await getPool().query("SELECT * FROM bookings WHERE id = $1", [id])).rows[0];

describe("12-month retention", () => {
  it("anonymises bookings older than 12 months and keeps newer ones", async () => {
    const now = new Date("2031-06-15T10:00:00Z");
    const old = await insertBooking(new Date("2030-06-01T08:00:00Z"));
    const recent = await insertBooking(new Date("2030-07-01T08:00:00Z"));

    expect(await anonymizeExpiredBookings(now)).toBeGreaterThanOrEqual(1);

    const o = await row(old.id);
    expect(o.customer_name).toBe("Анонимизиран клиент");
    expect(o.customer_phone).toBe("000000");
    expect(o.customer_email).toBe("anonymized@invalid");
    expect(o.note).toBeNull();
    expect(o.anonymized_at).not.toBeNull();
    expect(o.status).toBe("completed"); // statistics stay
    // The personal link no longer works.
    expect(await getBookingByToken(old.token)).toBeNull();

    const r = await row(recent.id);
    expect(r.customer_name).toBe("Петя Петрова");
    expect(r.anonymized_at).toBeNull();
    expect(await getBookingByToken(recent.token)).not.toBeNull();
  });

  it("is idempotent", async () => {
    const now = new Date("2031-06-15T10:00:00Z");
    await anonymizeExpiredBookings(now);
    expect(await anonymizeExpiredBookings(now)).toBe(0);
  });
});
