"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-client";

const ACTIONS = [
  { status: "completed", label: "Проведена" },
  { status: "no_show", label: "Неявяване" },
  { status: "cancelled", label: "Отмени" },
] as const;

/** `started`: completed / no-show are offered only once the booking has begun (the server enforces it too). */
export default function StatusActions({ id, started }: { id: string; started: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function change(status: (typeof ACTIONS)[number]["status"]) {
    if (status === "cancelled" && !window.confirm("Да отменя ли резервацията? Часът ще се освободи.")) return;
    setBusy(true);
    setMessage(null);
    const res = await adminFetch(`/api/admin/bookings/${id}`, "PATCH", { status });
    setBusy(false);
    if (res.ok) router.refresh();
    else setMessage(String(res.data.message ?? "Грешка."));
  }

  return (
    <div className="actions">
      {ACTIONS.filter((a) => started || a.status === "cancelled").map((a) => (
        <button
          key={a.status}
          type="button"
          className={`btn-small ${a.status === "cancelled" ? "btn-small-danger" : ""}`}
          disabled={busy}
          onClick={() => change(a.status)}
        >
          {a.label}
        </button>
      ))}
      {message && <span className="err">{message}</span>}
    </div>
  );
}
