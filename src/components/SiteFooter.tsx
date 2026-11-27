import Link from "next/link";
import { company } from "@/content/company";
import { INFO_LINKS, LEGAL_LINKS } from "@/content/site";
import { getContact } from "@/lib/contact";

export default async function SiteFooter() {
  const contact = await getContact();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <section aria-labelledby="footer-brand">
          <h2 id="footer-brand" className="footer-title">
            {company.brand}
          </h2>
          <p>{company.tagline}</p>
          <p>
            Телефон: <a href={`tel:${contact.phoneHref}`}>{contact.phone}</a>
            <br />
            Имейл: <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </p>
        </section>

        {company.locations.map((l) => (
          <section key={l.slug} aria-labelledby={`footer-loc-${l.slug}`}>
            <h2 id={`footer-loc-${l.slug}`} className="footer-title">
              {l.city}
            </h2>
            <p>{l.address}</p>
            <ul className="plain">
              {l.hours.map((h) => (
                <li key={h.days}>
                  {h.days}: {h.time}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <nav aria-labelledby="footer-info">
          <h2 id="footer-info" className="footer-title">
            Информация
          </h2>
          <ul className="plain">
            <li>
              <Link href="/book">Запази дегустация</Link>
            </li>
            {INFO_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-legal">
          <h2 id="footer-legal" className="footer-title">
            Правна информация
          </h2>
          <ul className="plain">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="container footer-legal-line">
        © {new Date().getFullYear()} {company.legalName} · ЕИК {company.eik} · Цените са в евро с включен ДДС.
      </div>
    </footer>
  );
}
