"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelButton({ token }: { token: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      setMessage([body.message, body.phone].filter(Boolean).join(" ") || "Възникна грешка.");
    } catch {
      setMessage("Няма връзка със сървъра. Моля, опитайте отново.");
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button type="button" className="btn btn-secondary" onClick={() => setConfirming(true)}>
        Откажи резервацията
      </button>
    );
  }
  return (
    <div>
      {message && (
        <div className="alert alert-error" role="alert">
          {message}
        </div>
      )}
      <p>
        <strong>Сигурни ли сте, че искате да откажете дегустацията?</strong> Часът ще бъде освободен за други клиенти.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-danger" disabled={busy} onClick={cancel}>
          {busy ? "Отказване…" : "Да, откажи"}
        </button>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setConfirming(false)}>
          Не, запази я
        </button>
      </div>
    </div>
  );
}
