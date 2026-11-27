import type { Metadata } from "next";
import Link from "next/link";
import { listConsultants } from "@/lib/admin";
import { requireAdminPage } from "@/lib/admin-session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Консултанти" };

export default async function ConsultantsPage() {
  await requireAdminPage();
  const consultants = await listConsultants();
  return (
    <>
      <h1>Консултанти</h1>
      <div className="grid">
        {consultants.map((c) => (
          <Link key={c.id} href={`/admin/consultants/${c.id}`} className="choice">
            <strong>{c.name}</strong>
            <span className="meta">
              {c.city} · буфер {c.bufferMinutes} мин{c.active ? "" : " · неактивен"}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
