import { describe, expect, it } from "vitest";
import { computeSlots, type SlotInput } from "@/lib/slots";
import { formatTime, sofiaToUtc } from "@/lib/time";

const WORKDAY = [{ startMinutes: 9 * 60, endMinutes: 18 * 60 }];
// Monday 2026-12-07; "now" is a week earlier so lead time and horizon do not interfere.
const base: SlotInput = {
  date: "2026-12-07",
  now: new Date("2026-11-30T06:00:00Z"),
  intervals: WORKDAY,
  isDayOff: false,
  durationMinutes: 45,
  bufferMinutes: 15,
  busy: [],
};
const times = (input: SlotInput) => computeSlots(input).map(formatTime);

describe("computeSlots", () => {
  it("offers a 30-minute grid inside working hours, ending when the tasting still fits", () => {
    const t = times(base);
    expect(t[0]).toBe("09:00");
    expect(t[1]).toBe("09:30");
    expect(t.at(-1)).toBe("17:00"); // 17:00 + 45 min = 17:45 ≤ 18:00; 17:30 would end at 18:15
    expect(t).toHaveLength(17);
  });

  it("uses Sofia wall-clock time (UTC+2 in winter)", () => {
    expect(computeSlots(base)[0].toISOString()).toBe("2026-12-07T07:00:00.000Z");
  });

  it("returns nothing on a day off", () => {
    expect(computeSlots({ ...base, isDayOff: true })).toEqual([]);
  });

  it("returns nothing when there are no working hours that weekday", () => {
    expect(computeSlots({ ...base, intervals: [] })).toEqual([]);
  });

  it("blocks a booking plus its buffer and keeps a new tasting's buffer clear of the next booking", () => {
    // Existing booking 10:00–11:30 + 15 min buffer → blocked until 11:45.
    const busy = [{ start: sofiaToUtc(base.date, 600), end: sofiaToUtc(base.date, 705) }];
    const t = times({ ...base, durationMinutes: 90, busy });
    // 09:00 + 90 + 15 = 10:45 > 10:00 → blocked; next free start on the grid after 11:45 is 12:00.
    expect(t).not.toContain("09:00");
    expect(t).not.toContain("11:30");
    expect(t[0]).toBe("12:00");
  });

  it("never offers past slots or slots inside the 2-hour lead time", () => {
    const now = sofiaToUtc(base.date, 10 * 60 + 10); // 10:10 local
    const t = times({ ...base, now });
    expect(t[0]).toBe("12:30"); // ≥ 12:10, on the grid
  });

  it("returns nothing for past dates and beyond the 60-day horizon", () => {
    expect(computeSlots({ ...base, date: "2026-11-29" })).toEqual([]);
    expect(computeSlots({ ...base, date: "2027-01-29" }).length).toBe(17); // day 60 is allowed
    expect(computeSlots({ ...base, date: "2027-01-30" })).toEqual([]);
  });

  it("handles the DST switch day (2027-03-28, clocks jump 03:00 → 04:00)", () => {
    const now = new Date("2027-03-20T06:00:00Z");
    const slots = computeSlots({ ...base, date: "2027-03-28", now });
    expect(formatTime(slots[0])).toBe("09:00");
    expect(slots[0].toISOString()).toBe("2027-03-28T06:00:00.000Z"); // UTC+3 after the switch
  });

  it("supports several intervals per day (lunch break)", () => {
    const intervals = [
      { startMinutes: 540, endMinutes: 720 },
      { startMinutes: 780, endMinutes: 900 },
    ];
    const t = times({ ...base, intervals, durationMinutes: 60 });
    expect(t).toContain("11:00");
    expect(t).not.toContain("11:30");
    expect(t).not.toContain("12:30");
    expect(t).toContain("13:00");
    expect(t.at(-1)).toBe("14:00");
  });
});
