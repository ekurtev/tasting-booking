"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-client";

type Interval = { isoWeekday: number; start: string; end: string };

const WEEKDAYS = ["Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота", "Неделя"];
const INTERVAL_RE = /^\s*(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})\s*$/;

function toText(hours: Interval[], wd: number): string {
  return hours
    .filter((h) => h.isoWeekday === wd)
    .map((h) => `${h.start}-${h.end}`)
    .join(", ");
}

function parseDay(text: string, wd: number): Interval[] | string {
  if (!text.trim()) return [];
  const out: Interval[] = [];
  for (const part of text.split(",")) {
    const m = INTERVAL_RE.exec(part);
    if (!m) return `${WEEKDAYS[wd - 1]}: невалиден интервал „${part.trim()}“ (пример: 09:00-18:00).`;
    const pad = (h: string) => h.padStart(2, "0");
    out.push({ isoWeekday: wd, start: `${pad(m[1])}:${m[2]}`, end: `${pad(m[3])}:${m[4]}` });
  }
  return out;
}

export default function ScheduleEditor({
  consultantId,
  bufferMinutes,
  hours,
}: {
  consultantId: number;
  bufferMinutes: number;
  hours: Interval[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(form: HTMLFormElement) {
    const data = new FormData(form);
    const all: Interval[] = [];
    for (let wd = 1; wd <= 7; wd++) {
      const parsed = parseDay(String(data.get(`day-${wd}`) ?? ""), wd);
      if (typeof parsed === "string") {
        setMessage({ ok: false, text: parsed });
        return;
      }
      all.push(...parsed);
    }
    setBusy(true);
    setMessage(null);
    const res = await adminFetch(`/api/admin/consultants/${consultantId}/schedule`, "PUT", {
      bufferMinutes: Number(data.get("buffer")),
      hours: all,
    });
    setBusy(false);
    if (res.ok) {
      setMessage({ ok: true, text: "Графикът е запазен." });
      router.refresh();
    } else {
      setMessage({ ok: false, text: String(res.data.message ?? "Грешка.") });
    }
  }

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        void save(e.currentTarget);
      }}
    >
      {message && <div className={`alert ${message.ok ? "alert-ok" : "alert-error"}`}>{message.text}</div>}
      {WEEKDAYS.map((name, i) => (
        <div className="field field-inline" key={name}>
          <label htmlFor={`day-${i + 1}`}>{name}</label>
          <input
            id={`day-${i + 1}`}
            name={`day-${i + 1}`}
            defaultValue={toText(hours, i + 1)}
            placeholder="почивен ден"
          />
        </div>
      ))}
      <div className="field field-inline">
        <label htmlFor="buffer">Буфер след дегустация (мин)</label>
        <input id="buffer" name="buffer" type="number" min={0} max={240} step={5} defaultValue={bufferMinutes} />
      </div>
      <button type="submit" className="btn" disabled={busy}>
        {busy ? "Запазване…" : "Запази графика"}
      </button>
    </form>
  );
}
