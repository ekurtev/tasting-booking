import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { inject } from "vitest";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as logout } from "@/app/api/admin/logout/route";
import { GET as listBookings } from "@/app/api/admin/bookings/route";
import { PATCH as patchBooking } from "@/app/api/admin/bookings/[id]/route";
import { GET as listTypes, POST as createType } from "@/app/api/admin/types/route";
import { PATCH as patchType } from "@/app/api/admin/types/[id]/route";
import { GET as listConsultants } from "@/app/api/admin/consultants/route";
import { GET as getSchedule, PUT as putSchedule } from "@/app/api/admin/consultants/[id]/schedule/route";
import { DELETE as deleteDayOff, POST as postDayOff } from "@/app/api/admin/consultants/[id]/days-off/route";
import { GET as publicTypes } from "@/app/api/types/route";
import { GET as publicDays } from "@/app/api/days/route";
import { GET as publicSlots } from "@/app/api/slots/route";
import { POST as publicBook } from "@/app/api/bookings/route";
import { proxy } from "@/proxy";
import { closePool, getPool } from "@/lib/db";
import { resetRateLimits } from "@/lib/rate-limit";
import { addDays, isoWeekday, sofiaDate } from "@/lib/time";
import { migrate } from "../scripts/migrate.mjs";
import { TEST_ADMIN } from "./test-admin";

const ORIGIN = "http://test.local";
let ipCounter = 0;

function req(path: string, init: { method?: string; body?: unknown; cookie?: string; origin?: string | null; ip?: string } = {}) {
  const headers = new Headers({ host: "test.local", "x-real-ip": init.ip ?? `198.51.100.${(ipCounter++ % 250) + 1}` });
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.origin !== null && init.method && init.method !== "GET") headers.set("origin", init.origin ?? ORIGIN);
  if (init.body !== undefined) headers.set("content-type", "application/json");
  return new Request(`${ORIGIN}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

const ctx = (id: string | number) => ({ params: Promise.resolve({ id: String(id) }) });

async function signIn(): Promise<string> {
  const res = await login(req("/api/admin/login", { method: "POST", body: TEST_ADMIN }));
  expect(res.status).toBe(200);
  const setCookie = res.headers.get("set-cookie")!;
  return setCookie.split(";")[0];
}

let cookie: string;
let consultantId: number;
let typeId: number;
let originalHours: { iso_weekday: number; start_time: string; end_time: string }[];

beforeAll(async () => {
  const pool = getPool();
  consultantId = (await pool.query("SELECT id FROM consultants WHERE slug = 'maria-sofia'")).rows[0].id;
  typeId = (await pool.query("SELECT id FROM tasting_types WHERE slug = 'personal'")).rows[0].id;
  originalHours = (
    await pool.query("SELECT iso_weekday, start_time::text, end_time::text FROM weekly_hours WHERE consultant_id = $1", [
      consultantId,
    ])
  ).rows;
  resetRateLimits();
  cookie = await signIn();
});

beforeEach(() => resetRateLimits());

afterAll(async () => {
  // Restore seed state for other test files.
  const pool = getPool();
  await pool.query("DELETE FROM bookings");
  await pool.query("DELETE FROM days_off");
  await pool.query("UPDATE tasting_types SET active = true");
  await pool.query("DELETE FROM tasting_types WHERE slug LIKE 'type-%'");
  await pool.query("UPDATE consultants SET buffer_minutes = 15");
  await pool.query("DELETE FROM weekly_hours WHERE consultant_id = $1", [consultantId]);
  for (const h of originalHours) {
    await pool.query("INSERT INTO weekly_hours (consultant_id, iso_weekday, start_time, end_time) VALUES ($1, $2, $3, $4)", [
      consultantId,
      h.iso_weekday,
      h.start_time,
      h.end_time,
    ]);
  }
  await closePool();
});

describe("unauthenticated access gets nothing", () => {
  const calls: [string, (c?: string) => Promise<Response>][] = [
    ["GET bookings", (c) => listBookings(req(`/api/admin/bookings?consultant=1&date=2026-12-01`, { cookie: c }))],
    ["PATCH booking", (c) => patchBooking(req("/api/admin/bookings/x", { method: "PATCH", body: { status: "completed" }, cookie: c }), ctx("x"))],
    ["GET types", (c) => listTypes(req("/api/admin/types", { cookie: c }))],
    ["POST types", (c) => createType(req("/api/admin/types", { method: "POST", body: {}, cookie: c }))],
    ["PATCH type", (c) => patchType(req("/api/admin/types/1", { method: "PATCH", body: {}, cookie: c }), ctx(1))],
    ["GET consultants", (c) => listConsultants(req("/api/admin/consultants", { cookie: c }))],
    ["GET schedule", (c) => getSchedule(req("/api/admin/consultants/1/schedule", { cookie: c }), ctx(1))],
    ["PUT schedule", (c) => putSchedule(req("/api/admin/consultants/1/schedule", { method: "PUT", body: {}, cookie: c }), ctx(1))],
    ["POST day off", (c) => postDayOff(req("/api/admin/consultants/1/days-off", { method: "POST", body: {}, cookie: c }), ctx(1))],
    ["DELETE day off", (c) => deleteDayOff(req("/api/admin/consultants/1/days-off?day=2026-12-01", { method: "DELETE", cookie: c }), ctx(1))],
    ["POST logout", (c) => logout(req("/api/admin/logout", { method: "POST", cookie: c }))],
  ];

  for (const [name, call] of calls) {
    it(`${name}: 401 without a cookie and with a forged cookie`, async () => {
      for (const c of [undefined, "tb_admin_session=" + "A".repeat(43), "tb_admin_session=garbage"]) {
        const res = await call(c);
        expect(res.status).toBe(401);
        expect(Object.keys(await res.json()).sort()).toEqual(["error", "message"]);
      }
    });
  }

  it("the proxy redirects admin pages and blocks the admin API before any handler runs", () => {
    const page = proxy(new NextRequest(`${ORIGIN}/admin/types`));
    expect(page.status).toBe(307);
    expect(page.headers.get("location")).toBe(`${ORIGIN}/admin/login`);
    expect(proxy(new NextRequest(`${ORIGIN}/admin`)).status).toBe(307);
    expect(proxy(new NextRequest(`${ORIGIN}/api/admin/bookings`)).status).toBe(401);
    expect(proxy(new NextRequest(`${ORIGIN}/admin/login`)).status).toBe(200);
  });
});

describe("sign-in", () => {
  it("rejects wrong credentials without telling which part was wrong", async () => {
    const wrongPw = await login(req("/api/admin/login", { method: "POST", body: { ...TEST_ADMIN, password: "nope-nope-nope" } }));
    const wrongEmail = await login(req("/api/admin/login", { method: "POST", body: { ...TEST_ADMIN, email: "x@test.local" } }));
    expect(wrongPw.status).toBe(401);
    expect(wrongEmail.status).toBe(401);
    expect((await wrongPw.json()).message).toBe((await wrongEmail.json()).message);
  });

  it("sets an HttpOnly SameSite=Lax session cookie and stores only its hash", async () => {
    const res = await login(req("/api/admin/login", { method: "POST", body: TEST_ADMIN }));
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    const token = setCookie.split(";")[0].split("=")[1];
    const stored = await getPool().query("SELECT count(*)::int AS n FROM admin_sessions WHERE token_hash = $1", [token]);
    expect(stored.rows[0].n).toBe(0);
  });

  it("rejects cross-site sign-in attempts", async () => {
    const res = await login(req("/api/admin/login", { method: "POST", body: TEST_ADMIN, origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });

  it("is rate limited per IP and email", async () => {
    const ip = "203.0.113.77";
    for (let i = 0; i < 5; i++) {
      const r = await login(req("/api/admin/login", { method: "POST", body: { ...TEST_ADMIN, password: "wrong-wrong" }, ip }));
      expect(r.status).toBe(401);
    }
    const blocked = await login(req("/api/admin/login", { method: "POST", body: TEST_ADMIN, ip }));
    expect(blocked.status).toBe(429);
  });

  it("logout revokes the session", async () => {
    const c = await signIn();
    expect((await listTypes(req("/api/admin/types", { cookie: c }))).status).toBe(200);
    expect((await logout(req("/api/admin/logout", { method: "POST", cookie: c }))).status).toBe(200);
    expect((await listTypes(req("/api/admin/types", { cookie: c }))).status).toBe(401);
  });

  it("rejects state-changing admin requests from another origin even with a valid session", async () => {
    const res = await createType(
      req("/api/admin/types", {
        method: "POST",
        cookie,
        origin: "https://evil.example",
        body: { name: "X", durationMinutes: 30, priceCents: 100 },
      }),
    );
    expect(res.status).toBe(403);
  });
});

async function freeSlot(minDaysAhead = 2) {
  const days = (await (await publicDays(req(`/api/days?consultant=${consultantId}&type=${typeId}`))).json()).days as {
    date: string;
  }[];
  const date = days.find((d) => d.date >= addDays(sofiaDate(new Date()), minDaysAhead))!.date;
  const slots = (await (await publicSlots(req(`/api/slots?consultant=${consultantId}&type=${typeId}&date=${date}`))).json())
    .slots as string[];
  return { date, slot: slots[0] };
}

async function bookPublic(slot: string) {
  return publicBook(
    req("/api/bookings", {
      method: "POST",
      body: {
        tastingTypeId: typeId,
        consultantId,
        startsAt: slot,
        name: "Клиент Тестов",
        phone: "+359 888 000 111",
        email: "client@example.com",
        consent: true,
      },
    }),
  );
}

describe("day view and booking status", () => {
  it("shows a public booking in the consultant's day view and allows confirmed → completed only once", async () => {
    const { date, slot } = await freeSlot();
    expect((await bookPublic(slot)).status).toBe(201);

    const res = await listBookings(req(`/api/admin/bookings?consultant=${consultantId}&date=${date}`, { cookie }));
    const { bookings } = await res.json();
    const b = bookings.find((x: { startsAt: string }) => x.startsAt === slot);
    expect(b).toMatchObject({ typeName: "Лична дегустация", customerName: "Клиент Тестов", customerPhone: "+359 888 000 111", status: "confirmed" });

    const done = await patchBooking(req(`/api/admin/bookings/${b.id}`, { method: "PATCH", body: { status: "completed" }, cookie }), ctx(b.id));
    expect(done.status).toBe(200);
    const again = await patchBooking(req(`/api/admin/bookings/${b.id}`, { method: "PATCH", body: { status: "cancelled" }, cookie }), ctx(b.id));
    expect(again.status).toBe(409);
    const bogus = await patchBooking(req(`/api/admin/bookings/${b.id}`, { method: "PATCH", body: { status: "confirmed" }, cookie }), ctx(b.id));
    expect(bogus.status).toBe(400);
  });

  it("cancelling from the admin frees the slot on the public site", async () => {
    const { date, slot } = await freeSlot();
    expect((await bookPublic(slot)).status).toBe(201);
    const { bookings } = await (await listBookings(req(`/api/admin/bookings?consultant=${consultantId}&date=${date}`, { cookie }))).json();
    const b = bookings.find((x: { startsAt: string; status: string }) => x.startsAt === slot && x.status === "confirmed");
    await patchBooking(req(`/api/admin/bookings/${b.id}`, { method: "PATCH", body: { status: "cancelled" }, cookie }), ctx(b.id));
    const slots = (await (await publicSlots(req(`/api/slots?consultant=${consultantId}&type=${typeId}&date=${date}`))).json()).slots;
    expect(slots).toContain(slot);
  });
});

describe("tasting types", () => {
  it("creates, edits and deactivates a type; inactive types disappear from the public site", async () => {
    const created = await createType(
      req("/api/admin/types", {
        method: "POST",
        cookie,
        body: { name: "Тестова дегустация", description: "Описание", durationMinutes: 30, priceCents: 1500 },
      }),
    );
    expect(created.status).toBe(201);
    const { id } = await created.json();
    const names = async () => ((await (await publicTypes()).json()).types as { name: string }[]).map((t) => t.name);
    expect(await names()).toContain("Тестова дегустация");

    const edit = await patchType(
      req(`/api/admin/types/${id}`, {
        method: "PATCH",
        cookie,
        body: { name: "Тестова дегустация 2", description: "", durationMinutes: 60, priceCents: 2000, active: false },
      }),
      ctx(id),
    );
    expect(edit.status).toBe(200);
    expect(await names()).not.toContain("Тестова дегустация 2");

    const book = await publicBook(
      req("/api/bookings", {
        method: "POST",
        body: {
          tastingTypeId: id,
          consultantId,
          startsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
          name: "Клиент",
          phone: "+359888000111",
          email: "c@example.com",
          consent: true,
        },
      }),
    );
    expect(book.status).toBe(422);
  });

  it("validates type input", async () => {
    const res = await createType(req("/api/admin/types", { method: "POST", cookie, body: { name: "", durationMinutes: 5, priceCents: -1 } }));
    expect(res.status).toBe(400);
    expect(Object.keys((await res.json()).fieldErrors).sort()).toEqual(["durationMinutes", "name", "priceCents"]);
  });
});

describe("schedule and days off", () => {
  it("saving weekly hours changes the offered slots; overlapping intervals are rejected", async () => {
    const target = addDays(sofiaDate(new Date()), 7);
    const wd = isoWeekday(target);
    const save = (hours: { isoWeekday: number; start: string; end: string }[], bufferMinutes = 15) =>
      putSchedule(req(`/api/admin/consultants/${consultantId}/schedule`, { method: "PUT", cookie, body: { bufferMinutes, hours } }), ctx(consultantId));

    expect((await save([{ isoWeekday: wd, start: "10:00", end: "11:00" }])).status).toBe(200);
    const slots = (await (await publicSlots(req(`/api/slots?consultant=${consultantId}&type=${typeId}&date=${target}`))).json()).slots;
    expect(slots).toHaveLength(1); // 45 min in a 60-min window on a 30-min grid → 10:00 only

    const overlap = await save([
      { isoWeekday: wd, start: "09:00", end: "12:00" },
      { isoWeekday: wd, start: "11:00", end: "13:00" },
    ]);
    expect(overlap.status).toBe(400);

    const sched = await (await getSchedule(req(`/api/admin/consultants/${consultantId}/schedule`, { cookie }), ctx(consultantId))).json();
    expect(sched.hours).toEqual([{ isoWeekday: wd, start: "10:00", end: "11:00" }]);
  });

  it("a day off removes the day from the public calendar and can be removed again", async () => {
    await putSchedule(
      req(`/api/admin/consultants/${consultantId}/schedule`, {
        method: "PUT",
        cookie,
        body: { bufferMinutes: 15, hours: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ isoWeekday: d, start: "09:00", end: "18:00" })) },
      }),
      ctx(consultantId),
    );
    const day = addDays(sofiaDate(new Date()), 10);
    const days = async () =>
      ((await (await publicDays(req(`/api/days?consultant=${consultantId}&type=${typeId}`))).json()).days as { date: string }[]).map(
        (d) => d.date,
      );
    expect(await days()).toContain(day);

    const add = await postDayOff(req(`/api/admin/consultants/${consultantId}/days-off`, { method: "POST", cookie, body: { day, note: "отпуск" } }), ctx(consultantId));
    expect(add.status).toBe(201);
    expect(await days()).not.toContain(day);

    const del = await deleteDayOff(req(`/api/admin/consultants/${consultantId}/days-off?day=${day}`, { method: "DELETE", cookie }), ctx(consultantId));
    expect(del.status).toBe(200);
    expect(await days()).toContain(day);
  });
});

describe("admin bootstrap from .env", () => {
  it("creates the first admin only once and never overwrites it on restart; reset is explicit", async () => {
    const databaseUrl = inject("databaseUrl");
    const hashBefore = (await getPool().query("SELECT password_hash FROM admin_users")).rows[0].password_hash;
    await migrate({ databaseUrl, admin: { email: TEST_ADMIN.email, password: "another-password-456" } });
    const after = await getPool().query("SELECT count(*)::int AS n, max(password_hash) AS h FROM admin_users");
    expect(after.rows[0]).toEqual({ n: 1, h: hashBefore });
    expect(hashBefore).toMatch(/^scrypt\$/);

    await migrate({ databaseUrl, admin: { email: TEST_ADMIN.email, password: "another-password-456", resetPassword: true } });
    const ok = await login(req("/api/admin/login", { method: "POST", body: { email: TEST_ADMIN.email, password: "another-password-456" } }));
    expect(ok.status).toBe(200);
    await migrate({ databaseUrl, admin: { ...TEST_ADMIN, resetPassword: true } });

    await expect(migrate({ databaseUrl, admin: { email: TEST_ADMIN.email, password: "short" } })).rejects.toThrow(/at least 12/);
  });
});
