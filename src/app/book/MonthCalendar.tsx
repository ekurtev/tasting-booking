"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Month calendar for step „3. Дата“. Dates are plain 'YYYY-MM-DD' strings handled in UTC, so the
// visitor's time zone never shifts a day; "today" and the booking window come from the server
// (Europe/Sofia). Only days with free slots are buttons that can be chosen; past, non-working and fully
// booked days are disabled buttons (aria-disabled, not focusable).

export type CalendarDay = { date: string; slots: number };

const WEEKDAYS: [string, string][] = [
  ["Пн", "понеделник"],
  ["Вт", "вторник"],
  ["Ср", "сряда"],
  ["Чт", "четвъртък"],
  ["Пт", "петък"],
  ["Сб", "събота"],
  ["Нд", "неделя"],
];
const monthFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: "UTC", month: "long" });
const dayMonthFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: "UTC", day: "numeric", month: "long" });
const weekdayFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: "UTC", weekday: "long" });

const toDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const toYmd = (d: Date) => d.toISOString().slice(0, 10);
const addDaysYmd = (ymd: string, n: number) => {
  const d = toDate(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return toYmd(d);
};
const monthKey = (ymd: string) => ymd.slice(0, 7); // 'YYYY-MM'
const shiftMonth = (key: string, n: number) => {
  const d = new Date(`${key}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return toYmd(d).slice(0, 7);
};
const monthTitle = (key: string) => `${monthFmt.format(new Date(`${key}-01T00:00:00Z`))} ${key.slice(0, 4)}`;
/** Monday-based weekday index 0..6. */
const weekdayIndex = (ymd: string) => (toDate(ymd).getUTCDay() + 6) % 7;

export function slotsWord(n: number) {
  return n === 1 ? "1 свободен час" : `${n} свободни часа`;
}

export default function MonthCalendar({
  days,
  today,
  lastDay,
  selected,
  onSelect,
  onAnnounce,
}: {
  days: CalendarDay[];
  today: string;
  lastDay: string;
  selected: string | null;
  onSelect: (date: string) => void;
  onAnnounce: (text: string) => void;
}) {
  const available = useMemo(() => new Map(days.map((d) => [d.date, d.slots])), [days]);
  const sorted = useMemo(() => days.map((d) => d.date).sort(), [days]);
  const firstMonth = monthKey(today);
  const lastMonth = monthKey(lastDay);

  const initial = selected ?? sorted[0] ?? today;
  const [month, setMonth] = useState(monthKey(initial));
  // The one day that is in the tab order (roving tabindex).
  const [focusDate, setFocusDate] = useState<string | null>(selected ?? sorted[0] ?? null);
  const [popped, setPopped] = useState<string | null>(null);
  const moveFocus = useRef(false);
  const gridRef = useRef<HTMLTableElement>(null);

  // Keep the roving target on an available day of the visible month.
  const inMonth = sorted.filter((d) => monthKey(d) === month);
  const tabTarget =
    focusDate && monthKey(focusDate) === month && available.has(focusDate) ? focusDate : (inMonth[0] ?? null);

  useEffect(() => {
    if (!moveFocus.current || !tabTarget) return;
    moveFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${tabTarget}"]`)?.focus();
  }, [tabTarget, month]);

  function showMonth(next: string) {
    setMonth(next);
    const count = sorted.filter((d) => monthKey(d) === next).length;
    onAnnounce(`${monthTitle(next)}: ${count ? `${count} дни със свободни часове` : "няма свободни дни"}.`);
  }

  function goTo(date: string | undefined) {
    if (!date) return;
    moveFocus.current = true;
    setFocusDate(date);
    if (monthKey(date) !== month) showMonth(monthKey(date));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, date: string) {
    const after = (from: string) => sorted.find((d) => d >= from);
    const before = (from: string) => [...sorted].reverse().find((d) => d <= from);
    let target: string | undefined;
    switch (e.key) {
      case "ArrowRight":
        target = after(addDaysYmd(date, 1));
        break;
      case "ArrowLeft":
        target = before(addDaysYmd(date, -1));
        break;
      case "ArrowDown":
        target = after(addDaysYmd(date, 7));
        break;
      case "ArrowUp":
        target = before(addDaysYmd(date, -7));
        break;
      case "Home":
        target = inMonth[0];
        break;
      case "End":
        target = inMonth[inMonth.length - 1];
        break;
      default:
        return; // Enter / Space activate the button natively
    }
    e.preventDefault();
    goTo(target);
  }

  // Build the visible weeks (Monday first), padded with empty cells.
  const first = `${month}-01`;
  const lead = weekdayIndex(first);
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = first; monthKey(d) === month; d = addDaysYmd(d, 1)) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const canPrev = month > firstMonth;
  const canNext = month < lastMonth;

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button
          type="button"
          className="calendar-nav"
          onClick={() => canPrev && showMonth(shiftMonth(month, -1))}
          disabled={!canPrev}
          aria-label="Предишен месец"
        >
          ‹
        </button>
        <h3 className="calendar-title" id="calendar-title">
          {monthTitle(month)}
        </h3>
        <button
          type="button"
          className="calendar-nav"
          onClick={() => canNext && showMonth(shiftMonth(month, 1))}
          disabled={!canNext}
          aria-label="Следващ месец"
        >
          ›
        </button>
      </div>

      <table ref={gridRef} className="calendar-grid" key={month} aria-labelledby="calendar-title">
        <thead>
          <tr>
            {WEEKDAYS.map(([short, full]) => (
              <th key={short} scope="col">
                <abbr title={full}>{short}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((date, di) => {
                if (!date) return <td key={di} />;
                const slots = available.get(date);
                const isToday = date === today;
                const isSelected = date === selected;
                const day = Number(date.slice(8));
                // Accessible name = visible text + screen-reader-only words (no aria-label), so the visible
                // "1" / "17 своб." is part of the name (WCAG 2.5.3 Label in Name, axe label-content-name-mismatch).
                const rest = ` ${dayMonthFmt.format(toDate(date)).replace(/^\d+\s*/, "")}, ${weekdayFmt.format(toDate(date))}${isToday ? ", днес" : ""}`;
                if (!slots) {
                  const reason = date < today ? "минал ден" : "няма свободни часове";
                  return (
                    <td key={date}>
                      <button
                        type="button"
                        className={`cal-day is-disabled${isToday ? " is-today" : ""}`}
                        disabled
                        aria-disabled="true"
                        tabIndex={-1}
                      >
                        <span className="cal-num">{day}</span>
                        <span className="sr-only">
                          {rest}, {reason}
                        </span>
                      </button>
                    </td>
                  );
                }
                return (
                  <td key={date}>
                    <button
                      type="button"
                      data-date={date}
                      className={`cal-day is-available${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}${popped === date ? " pop" : ""}`}
                      tabIndex={date === tabTarget ? 0 : -1}
                      aria-pressed={isSelected}
                      onKeyDown={(e) => onKeyDown(e, date)}
                      onFocus={() => setFocusDate(date)}
                      onClick={() => {
                        setPopped(date);
                        onSelect(date);
                      }}
                    >
                      <span className="cal-num">{day}</span>
                      <span className="sr-only">{rest}:</span>
                      <span className="cal-free"> {slots} своб.</span>
                      <span className="sr-only"> ({slotsWord(slots)})</span>
                      <span className="cal-dot" aria-hidden="true" />
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="calendar-legend" aria-hidden="true">
        <li>
          <span className="swatch swatch-free" /> свободни часове
        </li>
        <li>
          <span className="swatch swatch-off" /> почивен, зает или минал ден
        </li>
        <li>
          <span className="swatch swatch-today" /> днес
        </li>
      </ul>
    </div>
  );
}
