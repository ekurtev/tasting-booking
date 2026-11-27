"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-client";

type Type = {
  id: number;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
};

/** Edit an existing tasting type, or create a new one when `type` is omitted. */
export default function TypeForm({ type }: { type?: Type }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [formKey, setFormKey] = useState(0);
  const prefix = type ? `t${type.id}` : "new";

  async function save(form: HTMLFormElement) {
    const data = new FormData(form);
    const price = Number(String(data.get("price") ?? "").replace(",", "."));
    const body = {
      name: data.get("name"),
      description: data.get("description"),
      durationMinutes: Number(data.get("duration")),
      priceCents: Number.isFinite(price) ? Math.round(price * 100) : -1,
      active: data.get("active") === "on",
    };
    setBusy(true);
    setMessage(null);
    const res = type
      ? await adminFetch(`/api/admin/types/${type.id}`, "PATCH", body)
      : await adminFetch("/api/admin/types", "POST", body);
    setBusy(false);
    if (!res.ok) {
      setMessage({ ok: false, text: String(res.data.message ?? "Грешка.") });
      return;
    }
    setMessage({ ok: true, text: type ? "Запазено." : "Дегустацията е добавена." });
    if (!type) setFormKey((k) => k + 1);
    router.refresh();
  }

  return (
    <form
      key={formKey}
      className={`card ${type && !type.active ? "card-muted" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        void save(e.currentTarget);
      }}
    >
      {message && <div className={`alert ${message.ok ? "alert-ok" : "alert-error"}`}>{message.text}</div>}
      <div className="field">
        <label htmlFor={`${prefix}-name`}>Име</label>
        <input id={`${prefix}-name`} name="name" defaultValue={type?.name} required maxLength={200} />
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-description`}>Описание</label>
        <textarea id={`${prefix}-description`} name="description" rows={2} defaultValue={type?.description} maxLength={2000} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor={`${prefix}-duration`}>Продължителност (мин)</label>
          <input
            id={`${prefix}-duration`}
            name="duration"
            type="number"
            min={15}
            max={480}
            step={5}
            defaultValue={type?.durationMinutes ?? 60}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-price`}>Цена (€)</label>
          <input
            id={`${prefix}-price`}
            name="price"
            inputMode="decimal"
            defaultValue={type ? (type.priceCents / 100).toFixed(2) : ""}
            required
          />
        </div>
      </div>
      <label className="checkbox">
        <input type="checkbox" name="active" defaultChecked={type?.active ?? true} />
        <span>Активна (показва се на сайта)</span>
      </label>
      <button type="submit" className="btn" disabled={busy}>
        {busy ? "Запазване…" : type ? "Запази" : "Добави"}
      </button>
    </form>
  );
}
