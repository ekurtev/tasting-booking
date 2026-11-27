import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { locationBySlug } from "@/content/company";
import { getBookingByToken } from "@/lib/booking";
import { readContact } from "@/lib/contact";
import { formatPrice } from "@/lib/format";
import { formatDateLong, formatTime } from "@/lib/time";
import CancelButton from "./CancelButton";

export const dynamic = "force-dynamic";

// The URL contains a secret token: never index it, never leak it via Referer
// (headers are also set in next.config.ts).
export const metadata: Metadata = {
  title: "Вашата резервация",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const STATUS_LABELS = {
  confirmed: "Потвърдена",
  completed: "Проведена",
  no_show: "Неявяване",
  cancelled: "Отменена",
} as const;

export default async function BookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await getBookingByToken(token);
  if (!booking) notFound();

  const { phone, phoneHref } = readContact();
  const address = locationBySlug(booking.locationSlug)?.address || booking.address || booking.locationName;
  const confirmed = booking.status === "confirmed";

  return (
    <>
      {confirmed && (
        <div className="alert alert-ok" role="status">
          Резервацията е потвърдена. Очакваме ви!
        </div>
      )}
      <h1>Вашата резервация</h1>
      <div className="card" style={{ marginBottom: 20 }}>
        <dl className="summary">
          <Row label="Статус">
            <span className={`badge ${confirmed ? "badge-ok" : "badge-muted"}`}>{STATUS_LABELS[booking.status]}</span>
          </Row>
          <Row label="Дегустация">{booking.typeName}</Row>
          <Row label="Дата">{formatDateLong(booking.startsAt)}</Row>
          <Row label="Час">
            {formatTime(booking.startsAt)} – {formatTime(booking.endsAt)}
          </Row>
          <Row label="Град">{booking.city}</Row>
          <Row label="Място">{address}</Row>
          <Row label="Консултант">{booking.consultantName}</Row>
          <Row label="Цена">{formatPrice(booking.priceCents)}</Row>
          <Row label="Име">{booking.customerName}</Row>
          <Row label="Телефон">{booking.customerPhone}</Row>
          <Row label="Имейл">{booking.customerEmail}</Row>
          {booking.guests && <Row label="Гости">{booking.guests}</Row>}
          {booking.note && <Row label="Бележка">{booking.note}</Row>}
        </dl>
      </div>

      {confirmed && (
        <section className="card">
          <h2>Отказ от резервацията</h2>
          <p className="meta">
            Запазете този адрес — това е вашият личен линк за преглед и отказ. Не го споделяйте с други хора.
          </p>
          {booking.canCancel ? (
            <CancelButton token={token} />
          ) : (
            <p>
              Онлайн отказ е възможен до 24 часа преди началото.
              {" "}
              Моля, обадете ни се на <a href={`tel:${phoneHref}`}>{phone}</a>.
            </p>
          )}
        </section>
      )}

      <p style={{ marginTop: 24 }}>
        <Link href="/">← Към началната страница</Link>
      </p>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
