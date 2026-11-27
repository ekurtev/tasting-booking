"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ALLERGEN_NOTICE } from "@/content/company";
import { formatDuration, formatPrice } from "@/lib/format";

type Type = { id: number; name: string; description: string; durationMinutes: number; priceCents: number };
type Consultant = { id: number; name: string; city: string; locationName: string };
type Day = { date: string; slots: number };

const TZ = "Europe/Sofia";
const timeFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const longDayFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const dateOf = (ymd: string) => new Date(`${ymd}T12:00:00Z`);
const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
const FIELD_ORDER = ["name", "phone", "email", "guests", "note", "consent"];

function slotsWord(n: number) {
  return n === 1 ? "1 свободен час" : `${n} свободни часа`;
}

const STEP_TITLES = ["Вид дегустация", "Консултант и град", "Дата", "Час", "Вашите данни"];

export default function BookingFlow({
  types,
  consultants,
  initialTypeId,
}: {
  types: Type[];
  consultants: Consultant[];
  initialTypeId: number | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialTypeId ? 1 : 0);
  const [typeId, setTypeId] = useState<number | null>(initialTypeId);
  const [consultantId, setConsultantId] = useState<number | null>(null);
  const [days, setDays] = useState<Day[] | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Polite announcements for screen readers (step changes, loading, results).
  const [announcement, setAnnouncement] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const type = types.find((t) => t.id === typeId) ?? null;
  const consultant = consultants.find((c) => c.id === consultantId) ?? null;

  const loadDays = useCallback(async (cId: number, tId: number) => {
    setDays(null);
    setAnnouncement("Зареждане на свободните дни…");
    const res = await fetch(`/api/days?consultant=${cId}&type=${tId}`, { cache: "no-store" });
    const list: Day[] = res.ok ? (await res.json()).days : [];
    setDays(list);
    setAnnouncement(list.length ? `Намерени са ${list.length} дни със свободни часове.` : "Няма свободни дни.");
  }, []);

  const loadSlots = useCallback(async (cId: number, tId: number, d: string) => {
    setSlots(null);
    setAnnouncement("Зареждане на свободните часове…");
    const res = await fetch(`/api/slots?consultant=${cId}&type=${tId}&date=${d}`, { cache: "no-store" });
    const list: string[] = res.ok ? (await res.json()).slots : [];
    setSlots(list);
    setAnnouncement(list.length ? `Намерени са ${slotsWord(list.length)}.` : "За този ден няма свободни часове.");
  }, []);

  // Move focus to the new step's heading so keyboard and screen-reader users land on the new content.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  function go(next: number) {
    setNotice(null);
    setStep(next);
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  }

  async function submit(form: HTMLFormElement) {
    if (!type || !consultant || !slot) return;
    const data = new FormData(form);
    setSubmitting(true);
    setNotice(null);
    setFieldErrors({});
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tastingTypeId: type.id,
          consultantId: consultant.id,
          startsAt: slot,
          name: data.get("name"),
          phone: data.get("phone"),
          email: data.get("email"),
          guests: data.get("guests"),
          note: data.get("note"),
          consent: data.get("consent") === "on",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 201) {
        router.push(`/booking/${body.token}`);
        return;
      }
      if (res.status === 409) {
        // Someone else took the slot: go back to the slot list with fresh data.
        setSlot(null);
        setStep(3);
        if (date) void loadSlots(consultant.id, type.id, date);
        setNotice(body.message);
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
        return;
      }
      if (res.status === 400 && body.fieldErrors) {
        setFieldErrors(body.fieldErrors);
        const first = FIELD_ORDER.find((f) => body.fieldErrors[f]);
        if (first) requestAnimationFrame(() => document.getElementById(first)?.focus());
        setNotice("Моля, поправете отбелязаните полета.");
        return;
      }
      setNotice(body.message ?? "Възникна грешка. Моля, опитайте отново.");
    } catch {
      setNotice("Няма връзка със сървъра. Моля, опитайте отново.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <ol className="steps" aria-label="Стъпки на резервацията">
        {STEP_TITLES.map((t, i) => (
          <li key={t} className={i <= step ? "done" : ""} aria-current={i === step ? "step" : undefined}>
            <span className="sr-only">
              {i + 1}. {t}
              {i < step ? " (готово)" : ""}
            </span>
          </li>
        ))}
      </ol>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      <h2 ref={headingRef} tabIndex={-1}>
        <span className="sr-only">
          Стъпка {step + 1} от {STEP_TITLES.length}:{" "}
        </span>
        <span aria-hidden="true">{step + 1}. </span>
        {STEP_TITLES[step]}
      </h2>
      {step > 0 && (
        <p className="back">
          <button type="button" className="link-btn" onClick={() => go(step - 1)}>
            ← Назад
          </button>
        </p>
      )}
      {notice && (
        <div className="alert alert-error" role="alert">
          {notice}
        </div>
      )}

      {step === 0 && (
        <>
        <p className="allergen">{ALLERGEN_NOTICE}</p>
        <div className="grid">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              className="choice"
              aria-pressed={t.id === typeId}
              onClick={() => {
                setTypeId(t.id);
                setDate(null);
                setSlot(null);
                go(1);
              }}
            >
              <strong>{t.name}</strong>
              <span className="meta">
                {formatDuration(t.durationMinutes)} · <span className="price">{formatPrice(t.priceCents)}</span>
              </span>
            </button>
          ))}
        </div>
        </>
      )}

      {step === 1 && (
        <div className="grid">
          {consultants.map((c) => (
            <button
              key={c.id}
              type="button"
              className="choice"
              aria-pressed={c.id === consultantId}
              onClick={() => {
                setConsultantId(c.id);
                setDate(null);
                setSlot(null);
                if (typeId) void loadDays(c.id, typeId);
                go(2);
              }}
            >
              <strong>{c.city}</strong>
              <span className="meta">
                Консултант: {c.name} · {c.locationName}
              </span>
            </button>
          ))}
        </div>
      )}

      {step === 2 &&
        (days === null ? (
          <p className="meta" aria-hidden="true">Зареждане на свободните дни…</p>
        ) : days.length === 0 ? (
          <p>В следващите 60 дни няма свободни часове. Моля, изберете друг консултант.</p>
        ) : (
          <div className="chips">
            {days.map((d) => (
              <button
                key={d.date}
                type="button"
                className="chip"
                aria-pressed={d.date === date}
                aria-label={`${longDayFmt.format(dateOf(d.date))}, ${slotsWord(d.slots)}`}
                onClick={() => {
                  setDate(d.date);
                  setSlot(null);
                  if (consultantId && typeId) void loadSlots(consultantId, typeId, d.date);
                  go(3);
                }}
              >
                {dayFmt.format(dateOf(d.date))}
                <small aria-hidden="true">{d.slots} своб.</small>
              </button>
            ))}
          </div>
        ))}

      {step === 3 && date && (
        <>
          <p className="meta">{longDayFmt.format(dateOf(date))}</p>
          {slots === null ? (
            <p className="meta" aria-hidden="true">Зареждане на свободните часове…</p>
          ) : slots.length === 0 ? (
            <p>За този ден вече няма свободни часове. Моля, изберете друга дата.</p>
          ) : (
            <div className="chips">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip"
                  aria-pressed={s === slot}
                  onClick={() => {
                    setSlot(s);
                    go(4);
                  }}
                >
                  {timeFmt.format(new Date(s))}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === 4 && type && consultant && slot && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <dl className="summary">
              <div>
                <dt>Дегустация</dt>
                <dd>{type.name}</dd>
              </div>
              <div>
                <dt>Град</dt>
                <dd>
                  {consultant.city} · {consultant.name}
                </dd>
              </div>
              <div>
                <dt>Дата и час</dt>
                <dd>
                  {longDayFmt.format(dateOf(date!))}, {timeFmt.format(new Date(slot))}
                </dd>
              </div>
              <div>
                <dt>Цена</dt>
                <dd>{formatPrice(type.priceCents)}</dd>
              </div>
            </dl>
          </div>
          <p className="meta">Полетата без „по желание“ са задължителни.</p>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submit(e.currentTarget);
            }}
          >
            <Field name="name" label="Име и фамилия" autoComplete="name" required error={fieldErrors.name} />
            <Field name="phone" label="Телефон" type="tel" autoComplete="tel" required error={fieldErrors.phone} />
            <Field name="email" label="Имейл" type="email" autoComplete="email" required error={fieldErrors.email} />
            <Field
              name="guests"
              label="Брой гости (по желание)"
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              error={fieldErrors.guests}
            />
            <div className="field">
              <label htmlFor="note">Бележка (по желание)</label>
              <textarea
                id="note"
                name="note"
                rows={3}
                maxLength={1000}
                aria-invalid={!!fieldErrors.note}
                aria-describedby={fieldErrors.note ? "note-error" : "note-hint"}
              />
              <span id="note-hint" className="hint">
                Моля, не пишете данни за здравето (напр. алергии) — обадете ни се.
              </span>
              {fieldErrors.note && (
                <span id="note-error" className="err">
                  {fieldErrors.note}
                </span>
              )}
            </div>
            <div className="checkbox">
              <input
                type="checkbox"
                id="consent"
                name="consent"
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.consent}
                aria-describedby={fieldErrors.consent ? "consent-error" : undefined}
              />
              <label htmlFor="consent">
                Запознах се с{" "}
                <a href="/obshti-usloviya" target="_blank" rel="noopener">
                  Общите условия<span className="sr-only"> (отваря се в нов прозорец)</span>
                </a>{" "}
                и{" "}
                <a href="/poveritelnost" target="_blank" rel="noopener">
                  Политиката за поверителност<span className="sr-only"> (отваря се в нов прозорец)</span>
                </a>
                .
              </label>
            </div>
            {fieldErrors.consent && (
              <p id="consent-error" className="err">
                {fieldErrors.consent}
              </p>
            )}
            <button type="submit" className="btn btn-block" disabled={submitting}>
              {submitting ? "Изпращане…" : "Потвърди резервацията"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function Field({
  name,
  label,
  error,
  ...rest
}: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        aria-invalid={!!error}
        aria-required={rest.required || undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...rest}
      />
      {error && (
        <span id={`${name}-error`} className="err">
          {error}
        </span>
      )}
    </div>
  );
}
