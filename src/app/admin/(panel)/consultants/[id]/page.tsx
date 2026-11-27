import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSchedule } from "@/lib/admin";
import { requireAdminPage } from "@/lib/admin-session";
import { parseId } from "@/lib/http";
import DaysOff from "./DaysOff";
import ScheduleEditor from "./ScheduleEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "График на консултант" };

export default async function ConsultantPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const id = parseId((await params).id);
  const schedule = id ? await getSchedule(id) : null;
  if (!schedule) notFound();
  const { consultant } = schedule;

  return (
    <>
      <p className="back">
        <Link href="/admin/consultants">← Всички консултанти</Link>
      </p>
      <h1>
        {consultant.name} <span className="meta">({consultant.city})</span>
      </h1>
      <section>
        <h2>Работно време</h2>
        <p className="meta">
          Часовете са по българско време. Няколко интервала в един ден се разделят със запетая, напр.
          „09:00-12:00, 13:00-18:00“. Празно поле = почивен ден. Промените не засягат съществуващи резервации.
        </p>
        <ScheduleEditor consultantId={consultant.id} bufferMinutes={consultant.bufferMinutes} hours={schedule.hours} />
      </section>
      <section>
        <h2>Почивни дни</h2>
        <DaysOff consultantId={consultant.id} daysOff={schedule.daysOff} />
      </section>
    </>
  );
}
