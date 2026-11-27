"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-client";

const dayFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: "UTC", weekday: "short", day: "numeric", month: "long", year: "numeric" });

export default function DaysOff({
  consultantId,
  daysOff,
}: {
  consultantId: number;
  daysOff: { day: string; note: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const base = `/api/admin/consultants/${consultantId}/days-off`;

  async function add(form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    setMessage(null);
    const res = await adminFetch(base, "POST", { day: data.get("day"), note: data.get("note") });
    setBusy(false);
    if (!res.ok) {
      setMessage({ ok: false, text: String(res.data.message ?? "Грешка.") });
      return;
    }
    const existing = Number(res.data.existingBookings ?? 0);
    setMessage({
      ok: existing === 0,
      text:
        existing === 0
          ? "Почивният ден е добавен."
          : `Почивният ден е добавен, но в този ден има ${existing} потвърдени резервации - свържете се с клиентите.`,
    });
    form.reset();
    router.refresh();
  }

  async function remove(day: string) {
    setBusy(true);
    const res = await adminFetch(`${base}?day=${day}`, "DELETE");
    setBusy(false);
    if (res.ok) router.refresh();
    else setMessage({ ok: false, text: String(res.data.message ?? "Грешка.") });
  }

  return (
    <div className="card">
      {message && <div className={`alert ${message.ok ? "alert-ok" : "alert-error"}`}>{message.text}</div>}
      {daysOff.length === 0 ? (
        <p className="meta">Няма предстоящи почивни дни.</p>
      ) : (
        <ul className="plain-list">
          {daysOff.map((d) => (
            <li key={d.day}>
              <span>
                {dayFmt.format(new Date(`${d.day}T12:00:00Z`))}
                {d.note && <span className="meta"> · {d.note}</span>}
              </span>
              <button type="button" className="btn-small btn-small-danger" disabled={busy} onClick={() => remove(d.day)}>
                Премахни
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="field-row"
        style={{ alignItems: "flex-end", marginTop: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          void add(e.currentTarget);
        }}
      >
        <div className="field">
          <label htmlFor="day">Дата</label>
          <input id="day" name="day" type="date" required />
        </div>
        <div className="field">
          <label htmlFor="note">Бележка</label>
          <input id="note" name="note" maxLength={200} placeholder="напр. отпуск" />
        </div>
        <div className="field">
          <button type="submit" className="btn" disabled={busy}>
            Добави
          </button>
        </div>
      </form>
    </div>
  );
}
