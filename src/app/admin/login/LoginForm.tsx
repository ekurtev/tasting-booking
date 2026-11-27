"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-client";

export default function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    setMessage(null);
    const res = await adminFetch("/api/admin/login", "POST", {
      email: data.get("email"),
      password: data.get("password"),
    });
    if (res.ok) {
      router.replace("/admin");
      router.refresh();
      return;
    }
    setMessage(String(res.data.message ?? "Неуспешен вход."));
    setBusy(false);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget);
      }}
    >
      {message && (
        <div className="alert alert-error" role="alert">
          {message}
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Имейл</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">Парола</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button type="submit" className="btn btn-block" disabled={busy}>
        {busy ? "Влизане…" : "Вход"}
      </button>
    </form>
  );
}
