import type { Metadata } from "next";
import { listAllTypes } from "@/lib/admin";
import { requireAdminPage } from "@/lib/admin-session";
import TypeForm from "./TypeForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Дегустации" };

export default async function TypesPage() {
  await requireAdminPage();
  const types = await listAllTypes();
  return (
    <>
      <h1>Видове дегустации</h1>
      <p className="meta">
        Неактивните дегустации не се показват на сайта, но съществуващите резервации за тях остават.
      </p>
      <div className="grid">
        {types.map((t) => (
          <TypeForm key={t.id} type={t} />
        ))}
      </div>
      <h2 style={{ marginTop: 32 }}>Нова дегустация</h2>
      <TypeForm />
    </>
  );
}
