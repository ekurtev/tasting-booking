import type { Metadata } from "next";
import { company } from "@/content/company";
import { getContact } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Контакти",
  description: "Телефон, имейл, адреси и работно време на „Сладка кутия“ в София и Бургас.",
  alternates: { canonical: "/kontakti" },
};

export default async function ContactsPage() {
  const c = await getContact();
  return (
    <>
      <h1>Контакти</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0 }}>
          Телефон: <a href={`tel:${c.phoneHref}`}>{c.phone}</a>
          <br />
          Имейл: <a href={`mailto:${c.email}`}>{c.email}</a>
        </p>
      </div>
      <div className="grid grid-2">
        {company.locations.map((l) => (
          <section key={l.slug} className="card" aria-labelledby={`loc-${l.slug}`}>
            <h2 id={`loc-${l.slug}`}>{l.city}</h2>
            <p style={{ margin: "0 0 8px" }}>
              {l.name}
              <br />
              {l.address}
            </p>
            <h3>Работно време</h3>
            <ul className="plain">
              {l.hours.map((h) => (
                <li key={h.days}>
                  {h.days}: {h.time}
                </li>
              ))}
            </ul>
            <p style={{ margin: "10px 0 0" }}>
              <a href={l.mapUrl} rel="noopener noreferrer">
                Виж на картата<span className="sr-only">: {l.city} (външен сайт OpenStreetMap)</span>
              </a>
            </p>
          </section>
        ))}
      </div>
      <p className="meta" style={{ marginTop: 16 }}>
        {company.legalName}, ЕИК {company.eik}, {company.registeredAddress}
      </p>
    </>
  );
}
