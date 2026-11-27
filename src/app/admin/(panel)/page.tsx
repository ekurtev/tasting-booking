import type { Metadata } from "next";
import Link from "next/link";
import { hasStarted, listBookingsForDay, listConsultants } from "@/lib/admin";
import { requireAdminPage } from "@/lib/admin-session";
import { addDays, formatDateLong, formatTime, isValidDate, sofiaDate, sofiaToUtc } from "@/lib/time";
import StatusActions from "./StatusActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "График за деня" };

const STATUS_LABELS = {
  confirmed: "Потвърдена",
  completed: "Проведена",
  no_show: "Неявяване",
  cancelled: "Отменена",
} as const;

export default async function DayViewPage({
  searchParams,
}: {
  searchParams: Promise<{ consultant?: string; date?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const consultants = await listConsultants();
  const consultant = consultants.find((c) => String(c.id) === sp.consultant) ?? consultants[0];
  const date = sp.date && isValidDate(sp.date) ? sp.date : sofiaDate(new Date());
  const bookings = consultant ? await listBookingsForDay(consultant.id, date) : [];
  const now = new Date();
  const link = (d: string) => `/admin?consultant=${consultant?.id ?? ""}&date=${d}`;

  return (
    <>
      <h1>График за деня</h1>
      <form method="get" className="admin-filters">
        <label>
          Консултант
          <select name="consultant" defaultValue={consultant?.id}>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.city})
              </option>
            ))}
          </select>
        </label>
        <label>
          Дата
          <input type="date" name="date" defaultValue={date} />
        </label>
        <button type="submit" className="btn">
          Покажи
        </button>
      </form>
      <p className="day-nav">
        <Link href={link(addDays(date, -1))}>← Предишен ден</Link>
        <Link href={link(sofiaDate(new Date()))}>Днес</Link>
        <Link href={link(addDays(date, 1))}>Следващ ден →</Link>
      </p>
      <h2>{formatDateLong(sofiaToUtc(date, 12 * 60))}</h2>

      {bookings.length === 0 ? (
        <p className="meta">Няма резервации за този ден.</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Час</th>
                <th>Дегустация</th>
                <th>Клиент</th>
                <th>Телефон</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className={b.status === "cancelled" ? "row-muted" : undefined}>
                  <td>
                    {formatTime(b.startsAt)}–{formatTime(b.endsAt)}
                  </td>
                  <td>{b.typeName}</td>
                  <td>
                    {b.customerName}
                    <div className="meta small">
                      {b.customerEmail}
                      {b.guests ? ` · ${b.guests} гости` : ""}
                    </div>
                    {b.note && <div className="meta small">„{b.note}“</div>}
                  </td>
                  <td>
                    <a href={`tel:${b.customerPhone.replace(/\s+/g, "")}`}>{b.customerPhone}</a>
                  </td>
                  <td>
                    <span className={`badge status-${b.status}`}>{STATUS_LABELS[b.status]}</span>
                  </td>
                  <td>
                    {b.status === "confirmed" ? <StatusActions id={b.id} started={hasStarted(b.startsAt, now)} /> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
